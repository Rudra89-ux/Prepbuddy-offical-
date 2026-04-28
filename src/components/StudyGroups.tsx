import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { StudyGroup, UserProfile } from '../types';
import { StudyGroupService } from '../services/studyGroupService';
import { 
  Users, 
  Plus, 
  MessageSquare, 
  BookOpen, 
  Trophy, 
  ChevronRight, 
  UserPlus, 
  Lock, 
  Globe,
  Settings,
  MoreVertical,
  X,
  Search,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { StudyGroupView } from './StudyGroupView';

export default function StudyGroups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    maxMembers: 10,
    isPrivate: true
  });

  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (!profile) return;

    // My groups
    const qMy = query(
      collection(db, 'studyGroups'), 
      where('memberIds', 'array-contains', profile.uid),
      orderBy('lastActive', 'desc')
    );
    
    const unsubMy = onSnapshot(qMy, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyGroup)));
      setLoading(false);
    });

    // Public groups
    const qPublic = query(
      collection(db, 'studyGroups'), 
      where('isPrivate', '==', false),
      where('exam', '==', profile.exam)
    );
    
    const unsubPublic = onSnapshot(qPublic, (snapshot) => {
      setPublicGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyGroup)));
    });

    return () => {
      unsubMy();
      unsubPublic();
    };
  }, [profile]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const gid = await StudyGroupService.createGroup(
        newGroupData.name,
        newGroupData.description,
        profile,
        newGroupData.maxMembers,
        newGroupData.isPrivate,
        profile.exam
      );
      setIsCreating(false);
      toast.success("Study group created!");
    } catch (error) {
      toast.error("Failed to create group");
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const gid = await StudyGroupService.joinGroupByCode(inviteCode, profile.uid);
      setIsJoining(false);
      setInviteCode('');
      toast.success("Joined group successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join group");
    }
  };

  if (selectedGroup) {
    return <StudyGroupView group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Study Groups
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium mt-1">Collab with top {profile?.exam} aspirants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none uppercase font-bold text-xs rounded-xl h-12" onClick={() => setIsJoining(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Join Group
          </Button>
          <Button className="flex-1 sm:flex-none uppercase font-bold text-xs rounded-xl h-12" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Circle
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Groups */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px] py-1">Active Circles</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.length > 0 ? (
              groups.map(group => (
                <motion.div 
                  key={group.id}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedGroup(group)}
                  className="group relative cursor-pointer"
                >
                  <Card className="premium-card h-full bg-secondary/20 border-border/50 hover:bg-secondary/40 transition-all">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-[8px] uppercase">{group.memberIds.length}/{group.maxMembers} Members</Badge>
                          {group.isPrivate ? <Lock className="w-3 h-3 text-muted-foreground" /> : <Globe className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      </div>
                      <h3 className="font-black text-lg uppercase tracking-tight line-clamp-1">{group.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-4">{group.description}</p>
                      
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex -space-x-2">
                          {group.memberIds.slice(0, 4).map((id, i) => (
                            <div key={id} className="w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                              {id[0].toUpperCase()}
                            </div>
                          ))}
                          {group.memberIds.length > 4 && (
                            <div className="w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                              +{group.memberIds.length - 4}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="col-span-full border-dashed border-border/50 bg-transparent py-20 flex flex-col items-center justify-center text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">You haven't joined any groups yet</p>
                <Button variant="link" className="mt-2 text-primary" onClick={() => setIsJoining(true)}>Explore public circles</Button>
              </Card>
            )}
          </div>
        </section>

        {/* Public Groups & Sidebar */}
        <aside className="space-y-8">
          <Card className="premium-card overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/50">
              <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Discover Public Circles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                  {publicGroups.filter(pg => !groups.find(g => g.id === pg.id)).map(pg => (
                    <div key={pg.id} className="p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all flex justify-between items-center group">
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-tight">{pg.name}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase">{pg.memberIds.length}/{pg.maxMembers} Aspirants</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-primary hover:bg-primary/10 rounded-lg p-2"
                        onClick={() => StudyGroupService.joinPublicGroup(pg.id, profile?.uid || '')}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {publicGroups.length === 0 && (
                    <p className="text-[10px] text-center text-muted-foreground p-8 uppercase tracking-widest">No public circles found for your exam</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="premium-card bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-xl">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <h4 className="font-black text-xs uppercase tracking-widest text-green-500">Collaborative Learning</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect with aspirants to share notes, solve doubts together, and climb the leaderboard. Group study increases retention and motivation.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-background border border-border rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Create Study Circle</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Group Name</Label>
                  <Input 
                    required 
                    placeholder="e.g., JEE Advanced Toppers 2025" 
                    className="h-12 bg-secondary/50 rounded-xl"
                    value={newGroupData.name}
                    onChange={e => setNewGroupData({...newGroupData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Description</Label>
                  <Input 
                    required 
                    placeholder="Briefly describe your group's goals" 
                    className="h-12 bg-secondary/50 rounded-xl"
                    value={newGroupData.description}
                    onChange={e => setNewGroupData({...newGroupData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Capacity</Label>
                    <Input 
                      type="number"
                      min={2}
                      max={20}
                      className="h-12 bg-secondary/50 rounded-xl"
                      value={newGroupData.maxMembers}
                      onChange={e => setNewGroupData({...newGroupData, maxMembers: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Privacy</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        variant={newGroupData.isPrivate ? 'default' : 'outline'}
                        className="flex-1 h-12 rounded-xl text-[10px] uppercase font-bold"
                        onClick={() => setNewGroupData({...newGroupData, isPrivate: true})}
                      >
                        <Lock className="w-3 h-3 mr-2" /> Private
                      </Button>
                      <Button 
                        type="button"
                        variant={!newGroupData.isPrivate ? 'default' : 'outline'}
                        className="flex-1 h-12 rounded-xl text-[10px] uppercase font-bold"
                        onClick={() => setNewGroupData({...newGroupData, isPrivate: false})}
                      >
                        <Globe className="w-3 h-3 mr-2" /> Public
                      </Button>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl uppercase font-black text-sm shadow-xl shadow-primary/20">
                  Launch Circle
                </Button>
              </form>
            </motion.div>
          </div>
        )}

        {isJoining && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-background border border-border rounded-3xl shadow-2xl overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter mb-2">Enter Invite Code</h2>
              <p className="text-xs text-muted-foreground mb-6 uppercase tracking-widest">Connect to a private study circle</p>
              
              <form onSubmit={handleJoinByCode} className="space-y-4">
                <Input 
                  required 
                  placeholder="CODE-X" 
                  className="h-14 bg-secondary/50 rounded-2xl text-center text-xl font-black tracking-[0.5em] uppercase"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                />
                <Button type="submit" className="w-full h-12 rounded-xl uppercase font-bold text-xs">
                  Verify & Join
                </Button>
                <Button variant="ghost" type="button" className="w-full h-12 rounded-xl uppercase font-bold text-xs" onClick={() => setIsJoining(false)}>
                  Cancel
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
