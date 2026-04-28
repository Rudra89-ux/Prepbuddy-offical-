import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { StudyGroup, GroupMessage, GroupNote } from '../types';
import { StudyGroupService } from '../services/studyGroupService';
import { AIService } from '../services/aiService';
import { 
  MessageSquare, 
  BookOpen, 
  Trophy, 
  Sparkles, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  Circle,
  Plus,
  Loader2,
  ExternalLink,
  Info,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

export function StudyGroupView({ group, onBack }: { group: StudyGroup, onBack: () => void }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [notes, setNotes] = useState<GroupNote[]>([]);
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number}[]>([]);
  const [inputText, setInputText] = useState('');
  const [isDoubt, setIsDoubt] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qM = query(collection(db, 'studyGroups', group.id, 'messages'), orderBy('createdAt', 'asc'), limit(100));
    const unsubM = onSnapshot(qM, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage)));
    });

    const qN = query(collection(db, 'studyGroups', group.id, 'notes'), orderBy('createdAt', 'desc'));
    const unsubN = onSnapshot(qN, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupNote)));
    });

    return () => {
      unsubM();
      unsubN();
    };
  }, [group.id]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      StudyGroupService.getLeaderboard(group.id).then(setLeaderboard);
    }
  }, [activeTab, group.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !profile) return;
    
    const text = inputText;
    const type = isDoubt ? 'doubt' : 'text';
    setInputText('');
    setIsDoubt(false);

    try {
      await StudyGroupService.sendMessage(group.id, profile.uid, profile.displayName, text, type as any);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const getAIInsights = async () => {
    if (messages.length < 5) {
      toast.info("Need more messages for AI analysis");
      return;
    }
    setAiLoading(true);
    try {
      const insight = await AIService.getGroupInsights(messages.slice(-20).map(m => `${m.senderName}: ${m.text}`), group.exam);
      setAiInsight(insight || "Optimization in progress...");
    } catch (error) {
      toast.error("AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title || !newNote.content || !profile) return;
    try {
      await StudyGroupService.shareNote(group.id, profile.uid, profile.displayName, newNote.title, newNote.content);
      setIsNoteModalOpen(false);
      setNewNote({ title: '', content: '' });
      toast.success("Note shared with group!");
    } catch (error) {
       toast.error("Failed to share note");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
      <header className="flex items-center justify-between bg-secondary/30 p-4 rounded-3xl border border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-black uppercase tracking-tighter text-lg flex items-center gap-2">
              {group.name}
              {group.isPrivate && <Badge variant="secondary" className="text-[8px] uppercase tracking-widest bg-primary/10 text-primary">Invite: {group.inviteCode}</Badge>}
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{group.memberIds.length} Aspirants sharing wisdom</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={getAIInsights} disabled={aiLoading} className="rounded-xl border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10 h-10">
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI Mentor
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="bg-secondary/30 p-1 rounded-2xl w-fit mb-4">
          <TabsTrigger value="chat" className="rounded-xl text-[10px] uppercase font-bold px-4 py-2"><MessageSquare className="w-3 h-3 mr-2" /> Discussion</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-xl text-[10px] uppercase font-bold px-4 py-2"><BookOpen className="w-3 h-3 mr-2" /> Note Bank</TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-xl text-[10px] uppercase font-bold px-4 py-2"><Trophy className="w-3 h-3 mr-2" /> Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col gap-4 overflow-hidden">
          <Card className="flex-1 premium-card flex flex-col overflow-hidden border-border/50">
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.senderId === profile?.uid ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-3 ${
                        m.senderId === profile?.uid ? 'bg-primary text-primary-foreground rounded-tr-none' : 
                        m.type === 'doubt' ? 'bg-orange-500/10 border border-orange-500/30 rounded-tl-none' :
                        'bg-secondary/50 rounded-tl-none'
                      }`}>
                        {m.senderId !== profile?.uid && <p className="text-[8px] font-black uppercase mb-1 opacity-60">{m.senderName}</p>}
                        {m.type === 'doubt' && <Badge variant="secondary" className="bg-orange-500 text-white text-[7px] uppercase mb-1">Doubt</Badge>}
                        <p className="text-sm">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <AnimatePresence>
                {aiInsight && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="p-4 bg-indigo-500/10 border-t border-indigo-500/20 relative group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-500">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Circle Insight</p>
                        <div className="text-xs text-muted-foreground leading-relaxed prose prose-invert max-w-none">
                          <Markdown>{aiInsight}</Markdown>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 rounded-full h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => setAiInsight(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSendMessage} className="p-4 bg-secondary/20 border-t border-border/50 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <Button 
                    type="button"
                    variant={isDoubt ? 'default' : 'outline'} 
                    size="sm" 
                    className={`h-7 rounded-full text-[9px] uppercase font-black tracking-widest ${isDoubt ? 'bg-orange-500 text-white' : 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10'}`}
                    onClick={() => setIsDoubt(!isDoubt)}
                  >
                    <Info className="w-3 h-3 mr-1" />
                    Ask Doubt
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder={isDoubt ? "Describe your doubt specifically..." : "Share your strategy or ask something..."} 
                    className="bg-background/50 border-border/50 rounded-xl"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                  />
                  <Button type="submit" className="rounded-xl h-10 w-12 p-0 shadow-lg shadow-primary/20">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
            <Card className="lg:col-span-2 premium-card flex flex-col overflow-hidden border-border/50">
              <CardHeader className="bg-secondary/20 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Shared Note Bank</CardTitle>
                <div className="flex items-center gap-3">
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-8 border-primary/20 text-primary text-[10px] uppercase font-black"
                    onClick={() => setIsNoteModalOpen(true)}
                  >
                     <Plus className="w-3 h-3 mr-1" /> Contribute
                   </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes.map(note => (
                      <Card key={note.id} className="bg-secondary/10 border-border/30 hover:border-primary/20 cursor-pointer transition-all">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                             <Badge variant="outline" className="text-[7px] uppercase font-bold h-4">Note</Badge>
                             <p className="text-[8px] text-muted-foreground uppercase font-black">{new Date(note.createdAt?.toDate()).toLocaleDateString()}</p>
                          </div>
                          <h4 className="font-bold text-sm leading-tight line-clamp-1 uppercase tracking-tighter">{note.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{note.content}</p>
                          <div className="pt-2 border-t border-border/30 flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black">{note.authorName[0]}</div>
                             <p className="text-[9px] uppercase font-bold text-muted-foreground">{note.authorName}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {notes.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground uppercase tracking-widest text-[10px]">No notes shared yet</div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            <aside className="space-y-4 overflow-hidden h-full">
               <Card className="premium-card bg-primary/5 border-primary/20 h-fit">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-[9px] uppercase font-black text-primary tracking-widest">Growth Tip</p>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      "Collective learning increases retention by 40%. Share your summaries to solidify your own understanding."
                    </p>
                  </CardContent>
               </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="flex-1 overflow-hidden">
           <Card className="max-w-xl mx-auto premium-card bg-secondary/10 border-border/50 h-full overflow-hidden flex flex-col">
              <CardHeader className="text-center p-8 bg-primary/5 border-b border-border/50">
                 <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
                 <CardTitle className="text-2xl font-black uppercase tracking-tighter">Circle Leaderboard</CardTitle>
                 <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Healthy competition fuels growth</p>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-4">
                     {leaderboard.map((user, idx) => (
                       <div key={user.name} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/30">
                          <div className="flex items-center gap-4">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                               idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                               idx === 1 ? 'bg-slate-400/20 text-slate-400' :
                               idx === 2 ? 'bg-amber-600/20 text-amber-600' :
                               'bg-muted text-muted-foreground'
                             }`}>
                               {idx + 1}
                             </div>
                             <span className="font-bold text-sm uppercase tracking-tight">{user.name}</span>
                          </div>
                          <div className="text-right">
                             <p className="text-lg font-black tracking-tighter">{user.score} XP</p>
                             <p className="text-[8px] uppercase text-muted-foreground font-black">Practice Score</p>
                          </div>
                       </div>
                     ))}
                     {leaderboard.length === 0 && (
                       <div className="text-center py-12 animate-pulse">
                         <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/30 mb-2" />
                         <p className="text-[10px] uppercase text-muted-foreground tracking-widest">Calculating scores...</p>
                       </div>
                     )}
                  </div>
                </ScrollArea>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-background border border-border rounded-3xl shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tighter">Share Note</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsNoteModalOpen(false)} className="rounded-full"><X className="w-4 h-4" /></Button>
              </div>
              <form onSubmit={handleCreateNote} className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Title</Label>
                   <Input 
                    required 
                    placeholder="e.g. Thermodynamics Summary" 
                    value={newNote.title}
                    onChange={e => setNewNote({...newNote, title: e.target.value})}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Content (Markdown supported)</Label>
                   <textarea 
                    required 
                    placeholder="Write your note here..." 
                    value={newNote.content}
                    onChange={e => setNewNote({...newNote, content: e.target.value})}
                    className="w-full h-48 bg-secondary/50 rounded-xl p-4 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button type="submit" className="w-full h-12 uppercase font-black tracking-widest rounded-xl">Publish to Group</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
