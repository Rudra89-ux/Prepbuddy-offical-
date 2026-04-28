import React, { useState } from 'react';
import { AIService } from '../services/aiService';
import { useAuth } from '../AuthContext';
import { 
  Sparkles, 
  Search, 
  Loader2, 
  Brain, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  RefreshCw,
  Zap,
  BookOpen,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Challenge {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function AICenter() {
  const { profile } = useAuth();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const generateNewChallenges = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    setLoading(true);
    setChallenges([]);
    setSelectedAnswers({});
    setShowResults(false);
    
    try {
      const data = await AIService.generateChallenge(profile?.exam || 'JEE', topic);
      setChallenges(data);
      if (data.length === 0) toast.error("Could not find enough context for this topic. Try something more specific.");
    } catch (error) {
      toast.error("AI Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (qIdx: number, option: string) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: option }));
  };

  const score = challenges.filter((c, idx) => selectedAnswers[idx] === c.correctAnswer).length;

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Real-Time Search Engine</span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">AI Knowledge Hub</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest max-w-2xl mx-auto font-medium">
          Generate current {profile?.exam} level challenges by scraping real-time educational trends and papers across the web.
        </p>
      </header>

      <Card className="premium-card bg-secondary/20 border-border/50 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Enter any topic (e.g., Rotation Mechanics, Coordination Compounds)..." 
                className="h-14 pl-12 bg-background/50 border-border/50 rounded-2xl text-lg font-medium"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generateNewChallenges()}
              />
            </div>
            <Button 
              size="lg" 
              className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20"
              onClick={generateNewChallenges}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Scrape & Generate
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-4 flex items-center gap-2">
            <Info className="w-3 h-3" /> Powered by Gemini Search Grounding for current syllabus accuracy.
          </p>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-20 text-center space-y-6"
          >
            <div className="relative w-24 h-24 mx-auto">
               <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
               <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
               <Brain className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black uppercase tracking-tighter">Analyzing Curriculum...</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Scouring educational databases for {topic}</p>
            </div>
          </motion.div>
        ) : challenges.length > 0 ? (
          <motion.div 
            key="results"
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="space-y-6">
              {challenges.map((c, idx) => (
                <Card key={idx} className="premium-card bg-secondary/10 border-border/50 overflow-hidden">
                  <CardHeader className="bg-primary/5 border-b border-border/50">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-1">Question {idx + 1}</Badge>
                      {showResults && (
                        selectedAnswers[idx] === c.correctAnswer ? 
                          <span className="text-xs font-bold text-green-500 uppercase flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Correct</span> :
                          <span className="text-xs font-bold text-red-500 uppercase flex items-center gap-1"><XCircle className="w-4 h-4" /> Incorrect</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <p className="text-lg font-medium leading-relaxed">{c.question}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {c.options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => handleOptionSelect(idx, opt)}
                          className={`p-4 rounded-xl border transition-all text-left group flex items-start gap-3 ${
                            selectedAnswers[idx] === opt ? 
                              'bg-primary border-primary text-primary-foreground shadow-lg' : 
                              'bg-secondary/30 border-border/50 hover:bg-secondary/50'
                          } ${showResults && opt === c.correctAnswer ? 'bg-green-500/20 border-green-500 text-green-500' : ''}`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                            selectedAnswers[idx] === opt ? 'bg-white/20' : 'bg-muted'
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span className="text-sm font-medium">{opt}</span>
                        </button>
                      ))}
                    </div>

                    <AnimatePresence>
                      {showResults && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="pt-6 border-t border-border/50 space-y-3"
                        >
                          <div className="flex items-center gap-2 text-indigo-500">
                             <HelpCircle className="w-4 h-4" />
                             <span className="text-[10px] uppercase font-black tracking-widest">Expert Explanation</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 italic">
                            {c.explanation}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="sticky bottom-8 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border border-border shadow-2xl rounded-3xl max-w-md mx-auto flex items-center justify-between gap-4">
               {showResults ? (
                 <div className="flex-1 flex items-center justify-between px-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Final Score</p>
                      <p className="text-2xl font-black tracking-tighter">{score} / {challenges.length}</p>
                    </div>
                    <Button onClick={generateNewChallenges} className="rounded-xl h-10 gap-2 uppercase font-bold text-xs">
                       <RefreshCw className="w-4 h-4" /> New Session
                    </Button>
                 </div>
               ) : (
                 <>
                   <div className="px-4">
                     <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Progress</p>
                     <p className="text-sm font-black tracking-tighter">{Object.keys(selectedAnswers).length} / {challenges.length} Answered</p>
                   </div>
                   <Button 
                    disabled={Object.keys(selectedAnswers).length < challenges.length}
                    onClick={() => setShowResults(true)}
                    className="flex-1 h-12 rounded-xl h-12 font-black uppercase text-xs"
                   >
                     Submit Answers
                   </Button>
                 </>
               )}
            </div>
          </motion.div>
        ) : (
          <div className="py-20 text-center space-y-6">
            <div className="inline-flex p-6 bg-secondary/30 rounded-3xl border border-border/50">
              <Brain className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Ready when you are</p>
              <p className="text-2xl font-black uppercase tracking-tighter">What are we mastering today?</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-4">
               {['Quantum Mechanics', 'Organic Chemistry', 'Calculus', 'Electrogenetics'].map(s => (
                 <Badge 
                  key={s} 
                  variant="outline" 
                  className="px-4 py-2 rounded-full cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all uppercase text-[8px] font-bold"
                  onClick={() => {setTopic(s); }}
                 >
                   {s}
                 </Badge>
               ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
