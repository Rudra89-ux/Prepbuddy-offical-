import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, onSnapshot, limit, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lecture, Quiz, Course, QuizAttempt, MockTest, Module, StudyGroup } from './types';
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
  Users,
  Play,
  Search,
  LayoutGrid,
  History,
  Loader2,
  User,
  Mail,
  Target,
  Mic,
  Filter,
  Trophy,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  Edit2,
  Menu,
  X,
  RotateCcw,
  FileText,
  List,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { StudyGroupView } from './components/StudyGroupView';
import StudyGroups from './components/StudyGroups';
import AICenter from './components/AICenter';

export type ViewType = 'dashboard' | 'resources' | 'quizzes' | 'courses' | 'modules' | 'mock-tests' | 'history' | 'settings' | 'admin' | 'groups' | 'ai-lab';

export default function Dashboard({ 
  onOpenAdmin, 
  onSelectLecture,
  onSelectQuiz,
  onSelectMockTest,
  onOpenReport,
  currentView,
  onViewChange
}: { 
  onOpenAdmin: () => void, 
  onSelectLecture: (lecture: Lecture) => void,
  onSelectQuiz: (quiz: Quiz) => void,
  onSelectMockTest: (test: MockTest) => void,
  onOpenReport: () => void,
  currentView: ViewType,
  onViewChange: (view: ViewType) => void
}) {
  const { profile, logout, isAdmin, isSubAdmin } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(profile.displayName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resourceTab, setResourceTab] = useState<'video' | 'audio' | 'pdf'>('video');

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

    const qC = query(collection(db, 'courses'), orderBy('createdAt', 'desc'), limit(100));
    const unsubC = onSnapshot(qC, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    });

    const qM = query(collection(db, 'modules'), orderBy('createdAt', 'desc'), limit(100));
    const unsubM = onSnapshot(qM, (snapshot) => {
      setModules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'modules');
    });

    const qQA = query(
      collection(db, 'quizAttempts'), 
      where('userId', '==', profile.uid),
      orderBy('completedAt', 'desc'), 
      limit(50)
    );
    const unsubQA = onSnapshot(qQA, (snapshot) => {
      setQuizAttempts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quizAttempts');
    });

    const qMT = query(collection(db, 'mockTests'), orderBy('createdAt', 'desc'), limit(50));
    const unsubMT = onSnapshot(qMT, (snapshot) => {
      setMockTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MockTest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mockTests');
    });

    const qSG = query(collection(db, 'studyGroups'), where('memberIds', 'array-contains', profile.uid));
    const unsubSG = onSnapshot(qSG, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyGroup)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'studyGroups');
    });

    return () => {
      unsubL();
      unsubQ();
      unsubC();
      unsubM();
      unsubQA();
      unsubMT();
      unsubSG();
    };
  }, [profile.uid]);

  if (!profile) return null;

  const filteredLectures = lectures.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || l.subject === selectedSubject;
    const matchesTopic = !selectedTopic || l.topic === selectedTopic;
    const matchesTab = l.type === resourceTab;
    return matchesSearch && matchesSubject && matchesTopic && matchesTab;
  });

  const availableTopics = Array.from(new Set(
    lectures
      .filter(l => !selectedSubject || l.subject === selectedSubject)
      .map(l => l.topic)
  )).sort();

  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || q.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || c.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const filteredModules = modules.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || m.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const completedLectures = lectures.filter(l => profile.completedResources?.includes(l.id));

  const handleGetStudyPlan = () => {
    toast.info("Study plan feature coming soon!", {
      description: "We are working on structured paths for your success.",
      duration: 3000,
    });
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || !profile) return;
    setIsSavingName(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: newName.trim()
      });
      setIsEditingName(false);
      toast.success("Name updated successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleResetProgress = async () => {
    if (!profile || isResetting) return;
    
    const confirm = window.confirm("Are you sure you want to reset all your resource progress? This cannot be undone.");
    if (!confirm) return;

    setIsResetting(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        completedResources: []
      });
      toast.success("Progress reset successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error("Failed to reset progress");
    } finally {
      setIsResetting(false);
    }
  };

  const examSubjects = profile.exam === 'JEE' 
    ? ['Physics', 'Chemistry', 'Maths'] 
    : ['Physics', 'Chemistry', 'Biology'];

  const renderContent = () => {
    switch (currentView) {
      case 'resources':
        return (
          <section className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Study Resources</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Browse your curriculum</p>
                </div>
              </div>
              
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl gap-2 h-9 border-primary/20 bg-primary/5 text-primary"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Menu className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold">Filters</span>
                </Button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsFilterOpen(false)}
                        className="fixed inset-0 z-[100]"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-2xl shadow-2xl z-[101] p-4 space-y-4"
                      >
                        <div className="space-y-3">
                          <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground ml-1">Subject</Label>
                          <div className="flex flex-wrap gap-2">
                            {examSubjects.map(sub => (
                              <Badge 
                                key={sub}
                                variant={selectedSubject === sub ? 'default' : 'outline'}
                                className="cursor-pointer text-[8px] uppercase px-2 py-0.5"
                                onClick={() => {
                                  setSelectedSubject(selectedSubject === sub ? null : sub);
                                  setSelectedTopic(null);
                                }}
                              >
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {availableTopics.length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground ml-1">Topic</Label>
                            <ScrollArea className="h-40 -mx-1 px-1">
                              <div className="flex flex-wrap gap-2">
                                {availableTopics.map(topic => (
                                  <Badge 
                                    key={topic}
                                    variant={selectedTopic === topic ? 'default' : 'outline'}
                                    className="cursor-pointer text-[8px] uppercase px-2 py-0.5"
                                    onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                                  >
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        <div className="pt-3 border-t border-border flex gap-2">
                          <Button 
                            variant="ghost" 
                            className="flex-1 h-8 text-[9px] uppercase font-bold"
                            onClick={() => {
                              setSelectedSubject(null);
                              setSelectedTopic(null);
                              setIsFilterOpen(false);
                            }}
                          >
                            Clear
                          </Button>
                          <Button 
                            className="flex-1 h-8 text-[9px] uppercase font-bold"
                            onClick={() => setIsFilterOpen(false)}
                          >
                            Apply
                          </Button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              <Button 
                variant={resourceTab === 'video' ? 'default' : 'outline'}
                size="sm"
                className="rounded-xl h-9 text-[10px] uppercase font-bold whitespace-nowrap"
                onClick={() => setResourceTab('video')}
              >
                <Play className="w-3 h-3 mr-2" />
                Video Lectures
              </Button>
              <Button 
                variant={resourceTab === 'audio' ? 'default' : 'outline'}
                size="sm"
                className="rounded-xl h-9 text-[10px] uppercase font-bold whitespace-nowrap"
                onClick={() => setResourceTab('audio')}
              >
                <Mic className="w-3 h-3 mr-2" />
                Discussion
              </Button>
              <Button 
                variant={resourceTab === 'pdf' ? 'default' : 'outline'}
                size="sm"
                className="rounded-xl h-9 text-[10px] uppercase font-bold whitespace-nowrap"
                onClick={() => setResourceTab('pdf')}
              >
                <FileText className="w-3 h-3 mr-2" />
                Notes
              </Button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={`Search ${resourceTab === 'video' ? 'lectures' : resourceTab === 'audio' ? 'discussions' : 'notes'}...`} 
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
                  <LectureItem 
                    key={lecture.id} 
                    lecture={lecture} 
                    onClick={() => onSelectLecture(lecture)} 
                    isCompleted={profile.completedResources?.includes(lecture.id)}
                  />
                ))
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No {resourceTab === 'video' ? 'lectures' : resourceTab === 'audio' ? 'discussions' : 'notes'} found</p>
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
                filteredQuizzes.map(quiz => {
                  const attempt = quizAttempts.find(a => a.quizId === quiz.id);
                  return (
                    <QuizItem 
                      key={quiz.id} 
                      quiz={quiz} 
                      onClick={() => onSelectQuiz(quiz)} 
                      isAttempted={!!attempt}
                      score={attempt?.score}
                    />
                  );
                })
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No quizzes found</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'courses':
        return (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Structured Courses</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Complete learning paths</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {examSubjects.map(sub => (
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
                placeholder="Search courses..." 
                className="pl-10 h-12 bg-secondary/50 border-border/50 rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                <div className="p-8 text-center col-span-full"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" /></div>
              ) : filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <CourseItem key={course.id} course={course} />
                ))
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl col-span-full">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No courses found</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'modules':
        return (
          <section className="space-y-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <List className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Learning Modules</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Topic-wise structured learning</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {examSubjects.map(sub => (
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
                placeholder="Search modules..." 
                className="pl-10 h-12 bg-secondary/50 border-border/50 rounded-2xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {loading ? (
                <div className="p-8 text-center col-span-full"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" /></div>
              ) : filteredModules.length > 0 ? (
                filteredModules.map(module => (
                  <ModuleItem 
                    key={module.id} 
                    module={module} 
                    onSelectLecture={onSelectLecture}
                    onSelectQuiz={onSelectQuiz}
                    lectures={lectures}
                    quizzes={quizzes}
                  />
                ))
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl col-span-full">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No modules found</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'mock-tests':
        return (
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest">Mock Tests</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Full-length exam practice</p>
              </div>
            </div>

            <div className="space-y-4">
              {mockTests.filter(mt => mt.exam === profile.exam).length > 0 ? (
                mockTests.filter(mt => mt.exam === profile.exam).map(test => (
                  <MockTestItem key={test.id} test={test} onStart={() => onSelectMockTest(test)} />
                ))
              ) : (
                <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">No mock tests available for {profile.exam}</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'groups':
        return <StudyGroups />;

      case 'ai-lab':
        return <AICenter />;

      case 'history':
        return (
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <History className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Study History</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Your completed resources</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {completedLectures.length > 0 ? (
                  completedLectures.map(lecture => (
                    <LectureItem 
                      key={lecture.id} 
                      lecture={lecture} 
                      onClick={() => onSelectLecture(lecture)} 
                      isCompleted={true}
                    />
                  ))
                ) : (
                  <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">No resources completed yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <Trophy className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Quiz History</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Your recent attempts</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {quizAttempts.length > 0 ? (
                  quizAttempts.map(attempt => (
                    <QuizAttemptItem key={attempt.id} attempt={attempt} />
                  ))
                ) : (
                  <div className="p-12 text-center border border-dashed border-border rounded-3xl">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">No quizzes attempted yet</p>
                  </div>
                )}
              </div>
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
                      <img src={profile.photoURL || undefined} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-primary/50">{profile.displayName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditingName ? (
                      <div className="flex gap-2">
                        <Input 
                          value={newName} 
                          onChange={e => setNewName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button size="sm" className="h-8" onClick={handleUpdateName} disabled={isSavingName}>
                          {isSavingName ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsEditingName(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold truncate">{profile.displayName}</h4>
                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setIsEditingName(true)}>
                          <Edit2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
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

              <Button variant="outline" className="w-full h-12 rounded-2xl border-orange-500/20 text-orange-500 hover:bg-orange-500/10" onClick={handleResetProgress} disabled={isResetting}>
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Reset Progress
              </Button>

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
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<BookOpen className="w-4 h-4 text-primary" />} 
                label="Resources" 
                value={profile.completedResources?.length || 0} 
                onClick={() => onViewChange('resources')}
              />
              <StatCard 
                icon={<Brain className="w-4 h-4 text-blue-500" />} 
                label="Quizzes" 
                value={quizAttempts.length} 
                onClick={() => onViewChange('history')}
              />
              <StatCard 
                icon={<Users className="w-4 h-4 text-green-500" />} 
                label="Study Groups" 
                value={groups.length} 
                onClick={() => onViewChange('groups')}
              />
              <StatCard 
                icon={<Sparkles className="w-4 h-4 text-indigo-500" />} 
                label="AI Lab" 
                value="New" 
                onClick={() => onViewChange('ai-lab')}
              />
            </section>

            {/* Recent Lectures */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary" />
                  Latest Resources
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] uppercase font-bold text-muted-foreground"
                  onClick={() => onViewChange('resources')}
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
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">No resources found</p>
                  </div>
                )}
              </div>
            </section>

            {/* Study Mentor */}
            <section className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Study Mentor</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Personalized Guidance</p>
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                "Keep up the consistency! Balancing your subjects is the key to cracking JEE/NEET."
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
              <img src={profile.photoURL || undefined} alt="Profile" className="w-full h-full object-cover" />
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
          {(isAdmin || isSubAdmin) && (
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
      <nav className="fixed bottom-0 left-0 right-0 p-2 sm:p-4 bg-background/80 backdrop-blur-xl border-t border-border z-50 overflow-x-auto no-scrollbar">
        <div className="max-w-2xl mx-auto flex justify-between items-center gap-6 px-4">
          <NavIcon 
            icon={<LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Home" 
            active={currentView === 'dashboard'} 
            onClick={() => onViewChange('dashboard')}
          />
          <NavIcon 
            icon={<BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Learn" 
            active={currentView === 'resources'} 
            onClick={() => onViewChange('resources')}
          />
          <NavIcon 
            icon={<Brain className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Quizzes" 
            active={currentView === 'quizzes'} 
            onClick={() => onViewChange('quizzes')}
          />
          <NavIcon 
            icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Groups" 
            active={currentView === 'groups'} 
            onClick={() => onViewChange('groups')}
          />
          <NavIcon 
            icon={<Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />} 
            label="AI Hub" 
            active={currentView === 'ai-lab'} 
            onClick={() => onViewChange('ai-lab')}
          />
          <NavIcon 
            icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Mocks" 
            active={currentView === 'mock-tests'} 
            onClick={() => onViewChange('mock-tests')}
          />
          <NavIcon 
            icon={<Settings className="w-4 h-4 sm:w-5 sm:h-5" />} 
            label="Profile" 
            active={currentView === 'settings'} 
            onClick={() => onViewChange('settings')}
          />
        </div>
      </nav>
    </div>
  );
}

function LectureItem({ lecture, onClick, isCompleted }: { lecture: Lecture, onClick: () => void, isCompleted?: boolean }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 sm:gap-4 group ${isCompleted ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20 hover:bg-secondary/40'}`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground'}`}>
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.div>
        ) : (
          lecture.type === 'audio' ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : 
          lecture.type === 'pdf' ? <FileText className="w-4 h-4 sm:w-5 sm:h-5" /> :
          <Play className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 sm:gap-2 mb-1">
          <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{lecture.subject}</Badge>
          <Badge variant="outline" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{lecture.topic}</Badge>
        </div>
        <h4 className={`text-xs sm:text-sm font-bold truncate ${isCompleted ? 'text-primary' : ''}`}>{lecture.title}</h4>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{lecture.description}</p>
      </div>
      <ChevronRight className={`w-4 h-4 transition-colors flex-shrink-0 ${isCompleted ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
    </motion.div>
  );
}

function MockTestItem({ test, onStart }: { test: MockTest, onStart: () => void }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      className="p-4 rounded-2xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all cursor-pointer flex items-center gap-4 group"
      onClick={onStart}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors overflow-hidden">
        {test.imageUrl ? (
          <img src={test.imageUrl} alt={test.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <Trophy className="w-6 h-6" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-1">
          <Badge variant="secondary" className="text-[8px] uppercase">{test.exam}</Badge>
          <Badge variant="outline" className="text-[8px] uppercase">{test.durationMinutes} Mins</Badge>
          <Badge variant="outline" className="text-[8px] uppercase">{test.questions.length} Questions</Badge>
        </div>
        <h4 className="text-sm font-bold truncate">{test.title}</h4>
        <p className="text-[10px] text-muted-foreground truncate">{test.description}</p>
      </div>
      <Button size="sm" className="rounded-xl font-bold uppercase text-[10px]">Start</Button>
    </motion.div>
  );
}

function QuizItem({ quiz, onClick, isAttempted, score }: { quiz: Quiz, onClick: () => void, isAttempted?: boolean, score?: number }) {
  return (
    <motion.div 
      whileHover={!isAttempted ? { scale: 1.01, x: 4 } : {}}
      whileTap={!isAttempted ? { scale: 0.99 } : {}}
      onClick={!isAttempted ? onClick : undefined}
      className={`p-3 sm:p-4 rounded-2xl border border-border transition-all flex items-center gap-3 sm:gap-4 group ${isAttempted ? 'bg-secondary/10 opacity-80 cursor-default' : 'bg-secondary/20 hover:bg-secondary/40 cursor-pointer'}`}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${isAttempted ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 group-hover:bg-blue-500 group-hover:text-white'}`}>
        {isAttempted ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Brain className="w-4 h-4 sm:w-5 sm:h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <div className="flex gap-1 sm:gap-2">
            <Badge variant="secondary" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{quiz.subject}</Badge>
            <Badge variant="outline" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{quiz.questions.length} Qs</Badge>
          </div>
          {isAttempted && <Badge variant="default" className="bg-green-500 text-[7px] sm:text-[8px] uppercase px-1.5 py-0 h-4">Completed</Badge>}
        </div>
        <h4 className="text-xs sm:text-sm font-bold truncate">{quiz.title}</h4>
        <div className="flex justify-between items-center">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{quiz.topic}</p>
          {isAttempted && score !== undefined && (
            <span className="text-[10px] font-black text-green-500">SCORE: {score}/{quiz.questions.length}</span>
          )}
        </div>
      </div>
      {!isAttempted && <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />}
    </motion.div>
  );
}

function QuizAttemptItem({ attempt }: { attempt: QuizAttempt }) {
  const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
  const date = attempt.completedAt?.toDate?.() ? attempt.completedAt.toDate().toLocaleDateString() : 'Recent';

  return (
    <div className="p-3 sm:p-4 rounded-2xl border border-border bg-secondary/10 flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${percentage >= 70 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
        <Trophy className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <div className="flex gap-1 sm:gap-2">
            <Badge variant="secondary" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{attempt.subject}</Badge>
            <Badge variant="outline" className="text-[7px] sm:text-[8px] uppercase px-1.5 py-0">{attempt.topic}</Badge>
          </div>
          <span className="text-[8px] text-muted-foreground uppercase font-bold">{date}</span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h4 className="text-xs font-bold">Quiz Attempt</h4>
            <p className="text-[10px] text-muted-foreground">{attempt.score}/{attempt.totalQuestions} Correct</p>
          </div>
          <div className="text-right">
            <span className={`text-sm font-black tracking-tighter ${percentage >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseItem({ course }: { course: Course }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="p-4 rounded-3xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all cursor-pointer space-y-4 group"
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <GraduationCap className="w-6 h-6" />
        </div>
        <Badge variant="secondary" className="text-[8px] uppercase">{course.subject}</Badge>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold leading-tight">{course.title}</h4>
        <p className="text-[10px] text-muted-foreground line-clamp-2">{course.description}</p>
      </div>
      <div className="flex gap-2">
        <Badge variant="outline" className="text-[7px] uppercase">{course.lectureIds.length} Lectures</Badge>
        <Badge variant="outline" className="text-[7px] uppercase">{course.quizIds.length} Quizzes</Badge>
      </div>
      <Button className="w-full h-8 text-[10px] uppercase font-bold rounded-xl">Start Journey</Button>
    </motion.div>
  );
}

function ModuleItem({ 
  module, 
  onSelectLecture, 
  onSelectQuiz, 
  lectures, 
  quizzes 
}: { 
  module: Module, 
  onSelectLecture: (l: Lecture) => void,
  onSelectQuiz: (q: Quiz) => void,
  lectures: Lecture[],
  quizzes: Quiz[]
}) {
  const [isOpen, setIsOpen] = useState(false);
  const moduleLectures = lectures.filter(l => module.lectureIds?.includes(l.id));
  const moduleQuizzes = quizzes.filter(q => module.quizIds?.includes(q.id));

  return (
    <motion.div 
      layout
      className="rounded-3xl border border-border bg-secondary/20 overflow-hidden flex flex-col h-fit"
    >
      <div 
        className="p-4 cursor-pointer hover:bg-secondary/40 transition-all space-y-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-start">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
            <List className="w-6 h-6" />
          </div>
          <Badge variant="secondary" className="text-[8px] uppercase">{module.subject}</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold leading-tight">{module.title}</h4>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{module.topic}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[7px] uppercase">{moduleLectures.length} Lectures</Badge>
          <Badge variant="outline" className="text-[7px] uppercase">{moduleQuizzes.length} Quizzes</Badge>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-background/50"
          >
            <div className="p-4 space-y-4">
              {moduleLectures.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Lectures</p>
                  <div className="space-y-2">
                    {moduleLectures.map(l => (
                      <div 
                        key={l.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLecture(l);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all"
                      >
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                          <Play className="w-3 h-3" />
                        </div>
                        <p className="text-xs font-medium truncate">{l.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {moduleQuizzes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">Quizzes</p>
                  <div className="space-y-2">
                    {moduleQuizzes.map(q => (
                      <div 
                        key={q.id} 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectQuiz(q);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all"
                      >
                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                          <Brain className="w-3 h-3" />
                        </div>
                        <p className="text-xs font-medium truncate">{q.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {moduleQuizzes.length === 0 && moduleLectures.length === 0 && !module.driveLink && (
                <p className="text-[10px] text-center text-muted-foreground uppercase py-2">No resources in this module</p>
              )}
              {module.driveLink && (
                <div className="space-y-2">
                  <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest">External Resources</p>
                  <Button 
                    variant="outline" 
                    className="w-full h-10 rounded-xl border-indigo-500/20 bg-indigo-500/5 text-indigo-500 hover:bg-indigo-500/10 gap-2 text-xs font-bold uppercase"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(module.driveLink, '_blank');
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Drive Link
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
