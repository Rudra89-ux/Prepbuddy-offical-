import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lecture, Quiz } from './types';
import { 
  BookOpen, 
  Brain, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Shield,
  Settings,
  LogOut,
  Sparkles,
  Play,
  Search,
  LayoutGrid,
  History,
  Loader2,
  User,
  Mail,
  Target,
  Filter,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export type ViewType = 'dashboard' | 'lectures' | 'quizzes' | 'history' | 'settings' | 'admin';

export default function Dashboard({ 
  onOpenAdmin, 
  onSelectLecture,
  onSelectQuiz,
  currentView,
  onViewChange
}: { 
  onOpenAdmin: () => void, 
  onSelectLecture: (lecture: Lecture) => void,
  onSelectQuiz: (quiz: Quiz) => void,
  currentView: ViewType,
  onViewChange: (view: ViewType) => void
}) {
  const { profile, logout, isAdmin } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    const qL = query(collection(db, 'lectures'), orderBy('createdAt', 'desc'), limit(100));
    const unsubL = onSnapshot(qL, (snapshot) => {
      setLectures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lectures');
      setLoading(false);
    });

    const qQ = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(100));
    const unsubQ = onSnapshot(qQ, (snapshot) => {
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quizzes');
    });

    return () => {
      unsubL();
      unsubQ();
    };
  }, []);

  if (!profile) return null;

  const filteredLectures = lectures.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || l.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || q.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const completedLectures = lectures.filter(l => profile.completedLectures?.includes(l.id));

  const handleGetStudyPlan = () => {
    toast.info("AI is generating your personalized study plan...", {
      description: "This will be based on your completed lectures and target exam.",
      duration: 3000,
    });
  };

  const renderContent = () => {
    switch (currentView) {
      case 'lectures':
        return (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">All Lectures</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Browse your curriculum</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['Physics', 'Chemistry', 'Maths', 'Biology'].map(sub => (
                  <Badge 
                    key={sub}
                    variant={selectedSubject === sub ? 'default' : 'outline'}
                    className="cursor-pointer text-[8px] uppercase whitespace-nowrap"
                    onClick={() => setSelectedSubject(selectedSubject === sub ? null : sub)}
                  >
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search all lectures..." 
                className="pl-10 h-12 bg-secondary/50 border-border/50 rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" /></div>
              ) : filteredLectures.length > 0 ? (
                filteredLectures.map(lecture => (
                  <LectureItem key={lecture.id} lecture={lecture} onClick={() => onSelectLecture(lecture)} />
                ))
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No lectures found</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'quizzes':
        return (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Practice Quizzes</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Test your knowledge</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['Physics', 'Chemistry', 'Maths', 'Biology'].map(sub => (
                  <Badge 
                    key={sub}
                    variant={selectedSubject === sub ? 'default' : 'outline'}
                    className="cursor-pointer text-[8px] uppercase whitespace-nowrap"
                    onClick={() => setSelectedSubject(selectedSubject === sub ? null : sub)}
                  >
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search quizzes..." 
                className="pl-10 h-12 bg-secondary/50 border-border/50 rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
              {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" /></div>
              ) : filteredQuizzes.length > 0 ? (
                filteredQuizzes.map(quiz => (
                  <QuizItem key={quiz.id} quiz={quiz} onClick={() => onSelectQuiz(quiz)} />
                ))
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No quizzes found</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'history':
        return (
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <History className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest">Study History</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Your completed lectures</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {completedLectures.length > 0 ? (
                completedLectures.map(lecture => (
                  <LectureItem key={lecture.id} lecture={lecture} onClick={() => onSelectLecture(lecture)} />
                ))
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No history yet</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'settings':
        return (
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest">Settings</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Manage your profile</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center overflow-hidden">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-primary/50">{profile.displayName[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold truncate">{profile.displayName}</h4>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Exam</Label>
                    <div className="flex items-center gap-2 p-3 bg-background rounded-xl border border-border">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold">{profile.exam}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Account Status</Label>
                    <div className="flex items-center gap-2 p-3 bg-background rounded-xl border border-border">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold">{profile.isSubscribed ? 'Premium' : 'Free Tier'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full h-12 rounded-2xl border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </section>
        );

      default:
        return (
          <>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                ref={searchInputRef}
                placeholder="Search lectures or topics..." 
                className="pl-10 h-12 bg-secondary/50 border-border/50 rounded-2xl focus:bg-secondary/80 transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Quick Stats */}
            <section className="grid grid-cols-2 gap-4">
              <StatCard 
                icon={<BookOpen className="w-4 h-4 text-primary" />} 
                label="Lectures" 
                value={lectures.length} 
                onClick={() => onViewChange('lectures')}
              />
              <StatCard 
                icon={<History className="w-4 h-4 text-blue-500" />} 
                label="Completed" 
                value={profile.completedLectures?.length || 0} 
                onClick={() => onViewChange('history')}
              />
            </section>

            {/* Recent Lectures */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary" />
                  Latest Lectures
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] uppercase font-bold text-muted-foreground"
                  onClick={() => onViewChange('lectures')}
                >
                  View All
                </Button>
              </div>
              
              <div className="space-y-3">
                {loading ? (
                  <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" /></div>
                ) : filteredLectures.length > 0 ? (
                  filteredLectures.slice(0, 3).map(lecture => (
                    <LectureItem key={lecture.id} lecture={lecture} onClick={() => onSelectLecture(lecture)} />
                  ))
                ) : (
                  <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">No lectures found</p>
                  </div>
                )}
              </div>
            </section>

            {/* AI Study Mentor */}
            <section className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">AI Study Mentor</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Personalized Insights</p>
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                "You've been focusing heavily on Physics. Try balancing with Chemistry Organic revision today to maintain a steady progress."
              </p>
              <Button 
                onClick={handleGetStudyPlan}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase hover:scale-[1.02] transition-transform"
              >
                Get Study Plan
              </Button>
            </section>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Soft Background Gradients */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />
      
      <header className="p-4 sm:p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => onViewChange('settings')}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm sm:text-lg font-black text-primary/50">{profile.displayName[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black tracking-tighter leading-none truncate">HELLO, {profile.displayName.toUpperCase()}</h1>
            <p className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest truncate">Ready to learn?</p>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          {isAdmin && (
            <Button variant="outline" size="icon" onClick={onOpenAdmin} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-primary/20 bg-primary/5 text-primary">
              <Shield className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={logout} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-border/50">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="px-4 sm:px-6 space-y-6 sm:space-y-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 sm:space-y-8"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 bg-background/80 backdrop-blur-xl border-t border-border z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <NavIcon 
            icon={<LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Home" 
            active={currentView === 'dashboard'} 
            onClick={() => onViewChange('dashboard')}
          />
          <NavIcon 
            icon={<BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Lectures" 
            active={currentView === 'lectures'} 
            onClick={() => onViewChange('lectures')}
          />
          <div className="relative -top-6 sm:-top-8">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onViewChange('quizzes')}
              className="w-12 h-12 sm:w-16 sm:h-16 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center"
            >
              <Brain className="w-6 h-6 sm:w-8 sm:h-8" />
            </motion.button>
          </div>
          <NavIcon 
            icon={<History className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="History" 
            active={currentView === 'history'} 
            onClick={() => onViewChange('history')}
          />
          <NavIcon 
            icon={<Settings className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Settings" 
            active={currentView === 'settings'} 
            onClick={() => onViewChange('settings')}
          />
        </div>
      </nav>
    </div>
  );
}

function LectureItem({ lecture, onClick }: { lecture: Lecture, onClick: () => void }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="p-3 sm:p-4 rounded-2xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all cursor-pointer flex items-center gap-3 sm:gap-4 group"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0">
        <Play className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 sm:gap-2 mb-1">
          <Badge variant="secondary" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{lecture.subject}</Badge>
          <Badge variant="outline" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{lecture.topic}</Badge>
        </div>
        <h4 className="text-xs sm:text-sm font-bold truncate">{lecture.title}</h4>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{lecture.description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </motion.div>
  );
}

function QuizItem({ quiz, onClick }: { quiz: Quiz, onClick: () => void }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="p-3 sm:p-4 rounded-2xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all cursor-pointer flex items-center gap-3 sm:gap-4 group"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors flex-shrink-0">
        <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 sm:gap-2 mb-1">
          <Badge variant="secondary" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{quiz.subject}</Badge>
          <Badge variant="outline" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{quiz.questions.length} Qs</Badge>
        </div>
        <h4 className="text-xs sm:text-sm font-bold truncate">{quiz.title}</h4>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{quiz.topic}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </motion.div>
  );
}

function StatCard({ icon, label, value, onClick }: { icon: React.ReactNode, label: string, value: string | number, onClick?: () => void }) {
  return (
    <Card 
      className={`premium-card bg-secondary/30 border-border/50 transition-all ${onClick ? 'cursor-pointer hover:bg-secondary/50 active:scale-95' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center gap-1">
        <div className="p-1.5 sm:p-2 bg-background rounded-lg border border-border">
          {icon}
        </div>
        <p className="text-lg sm:text-xl font-black tracking-tighter">{value}</p>
        <p className="text-[7px] sm:text-[8px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function NavIcon({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 sm:gap-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {icon}
      <span className="text-[7px] sm:text-[8px] uppercase font-black tracking-tighter">{label}</span>
    </button>
  );
}
