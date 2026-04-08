import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType, serverTimestamp } from './lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Trash2, Users, BookOpen, BarChart3, Loader2, Brain, CheckCircle2, Edit2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Question, Subject, QuestionType, Lecture, Quiz, Course, UserProfile } from './types';

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'question' | 'lecture' | 'quiz' | 'course' | null>(null);

  // New Question Form
  const [newQ, setNewQ] = useState({
    subject: 'Physics' as Subject,
    topic: '',
    difficulty: 1,
    text: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    type: 'MCQ' as QuestionType
  });

  // New Lecture Form
  const [newL, setNewL] = useState({
    title: '',
    description: '',
    subject: 'Physics' as Subject,
    topic: '',
    videoUrl: ''
  });

  // New Quiz Form
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    subject: 'Physics' as Subject,
    topic: '',
    selectedQuestionIds: [] as string[]
  });

  // New Course Form
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    subject: 'Physics' as Subject,
    lectureIds: [] as string[],
    quizIds: [] as string[]
  });

  useEffect(() => {
    fetchQuestions();
    fetchLectures();
    fetchQuizzes();
    fetchCourses();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), limit(100));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(fetched);
    } catch (error) {
      console.error("Fetch users error:", error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'questions'), orderBy('subject'), limit(100));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuestions(fetched);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLectures = async () => {
    try {
      const q = query(collection(db, 'lectures'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
      setLectures(fetched);
    } catch (error) {
      console.error("Fetch lectures error:", error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
      setQuizzes(fetched);
    } catch (error) {
      console.error("Fetch quizzes error:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(fetched);
    } catch (error) {
      console.error("Fetch courses error:", error);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId && editingType === 'question') {
        await updateDoc(doc(db, 'questions', editingId), newQ);
        toast.success("Question updated");
      } else {
        await addDoc(collection(db, 'questions'), newQ);
        toast.success("Question added");
      }
      resetQuestionForm();
      fetchQuestions();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questions');
    } finally {
      setLoading(false);
    }
  };

  const resetQuestionForm = () => {
    setNewQ({
      subject: 'Physics',
      topic: '',
      difficulty: 1,
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      type: 'MCQ'
    });
    setEditingId(null);
    setEditingType(null);
  };

  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId && editingType === 'lecture') {
        await updateDoc(doc(db, 'lectures', editingId), newL);
        toast.success("Lecture updated");
      } else {
        await addDoc(collection(db, 'lectures'), {
          ...newL,
          createdAt: serverTimestamp()
        });
        toast.success("Lecture uploaded");
      }
      resetLectureForm();
      fetchLectures();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lectures');
    } finally {
      setLoading(false);
    }
  };

  const resetLectureForm = () => {
    setNewL({
      title: '',
      description: '',
      subject: 'Physics',
      topic: '',
      videoUrl: ''
    });
    setEditingId(null);
    setEditingType(null);
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuiz.selectedQuestionIds.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    setLoading(true);
    try {
      const selectedQuestions = questions.filter(q => newQuiz.selectedQuestionIds.includes(q.id));
      const quizData = {
        title: newQuiz.title,
        description: newQuiz.description,
        subject: newQuiz.subject,
        topic: newQuiz.topic,
        questions: selectedQuestions,
      };

      if (editingId && editingType === 'quiz') {
        await updateDoc(doc(db, 'quizzes', editingId), quizData);
        toast.success("Quiz updated");
      } else {
        await addDoc(collection(db, 'quizzes'), {
          ...quizData,
          createdAt: serverTimestamp()
        });
        toast.success("Quiz created");
      }
      resetQuizForm();
      fetchQuizzes();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
    } finally {
      setLoading(false);
    }
  };

  const resetQuizForm = () => {
    setNewQuiz({
      title: '',
      description: '',
      subject: 'Physics',
      topic: '',
      selectedQuestionIds: []
    });
    setEditingId(null);
    setEditingType(null);
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const courseData = {
        ...newCourse,
      };

      if (editingId && editingType === 'course') {
        await updateDoc(doc(db, 'courses', editingId), courseData);
        toast.success("Course updated");
      } else {
        await addDoc(collection(db, 'courses'), {
          ...courseData,
          createdAt: serverTimestamp()
        });
        toast.success("Course created");
      }
      resetCourseForm();
      fetchCourses();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'courses');
    } finally {
      setLoading(false);
    }
  };

  const resetCourseForm = () => {
    setNewCourse({
      title: '',
      description: '',
      subject: 'Physics',
      lectureIds: [],
      quizIds: []
    });
    setEditingId(null);
    setEditingType(null);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteDoc(doc(db, 'questions', id));
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
    }
  };

  const handleDeleteLecture = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this lecture?")) return;
    try {
      await deleteDoc(doc(db, 'lectures', id));
      toast.success("Lecture deleted");
      fetchLectures();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lectures/${id}`);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', id));
      toast.success("Quiz deleted");
      fetchQuizzes();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${id}`);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
      toast.success("Course deleted");
      fetchCourses();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
    }
  };

  const startEditQuestion = (q: Question) => {
    setEditingId(q.id);
    setEditingType('question');
    setNewQ({
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      text: q.text,
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      type: q.type
    });
  };

  const startEditLecture = (l: Lecture) => {
    setEditingId(l.id);
    setEditingType('lecture');
    setNewL({
      title: l.title,
      description: l.description,
      subject: l.subject,
      topic: l.topic,
      videoUrl: l.videoUrl
    });
  };

  const startEditQuiz = (q: Quiz) => {
    setEditingId(q.id);
    setEditingType('quiz');
    setNewQuiz({
      title: q.title,
      description: q.description,
      subject: q.subject,
      topic: q.topic,
      selectedQuestionIds: q.questions.map(question => question.id)
    });
  };

  const startEditCourse = (c: Course) => {
    setEditingId(c.id);
    setEditingType('course');
    setNewCourse({
      title: c.title,
      description: c.description,
      subject: c.subject,
      lectureIds: c.lectureIds,
      quizIds: c.quizIds
    });
  };

  const toggleQuestionSelection = (id: string) => {
    setNewQuiz(prev => ({
      ...prev,
      selectedQuestionIds: prev.selectedQuestionIds.includes(id)
        ? prev.selectedQuestionIds.filter(qid => qid !== id)
        : [...prev.selectedQuestionIds, id]
    }));
  };

  const toggleLectureSelection = (id: string) => {
    setNewCourse(prev => ({
      ...prev,
      lectureIds: prev.lectureIds.includes(id)
        ? prev.lectureIds.filter(lid => lid !== id)
        : [...prev.lectureIds, id]
    }));
  };

  const toggleQuizSelection = (id: string) => {
    setNewCourse(prev => ({
      ...prev,
      quizIds: prev.quizIds.includes(id)
        ? prev.quizIds.filter(qid => qid !== id)
        : [...prev.quizIds, id]
    }));
  };

  const handleApproveSubscription = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: 'active',
        isSubscribed: true
      });
      toast.success("Subscription approved");
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleRejectSubscription = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        subscriptionStatus: 'none',
        isSubscribed: false
      });
      toast.success("Subscription rejected");
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 border-b border-border bg-secondary/30 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase">Admin Console</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Logged in as: {user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit} className="text-xs uppercase font-bold">Exit</Button>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-hidden">
        <Tabs defaultValue="lectures" className="h-full flex flex-col">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-1 border-primary/20 bg-primary/5 hover:bg-primary/10"
              onClick={() => {
                const trigger = document.querySelector('[value="lectures"]') as HTMLElement;
                trigger?.click();
              }}
            >
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-[10px] uppercase font-bold">Lectures</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-1 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
              onClick={() => {
                const trigger = document.querySelector('[value="quizzes"]') as HTMLElement;
                trigger?.click();
              }}
            >
              <Brain className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] uppercase font-bold">Quizzes</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-1 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10"
              onClick={() => {
                const trigger = document.querySelector('[value="courses"]') as HTMLElement;
                trigger?.click();
              }}
            >
              <GraduationCap className="w-5 h-5 text-purple-500" />
              <span className="text-[10px] uppercase font-bold">Courses</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-1 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10"
              onClick={() => {
                const trigger = document.querySelector('[value="questions"]') as HTMLElement;
                trigger?.click();
              }}
            >
              <Plus className="w-5 h-5 text-orange-500" />
              <span className="text-[10px] uppercase font-bold">Questions</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col gap-1 border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
              onClick={() => {
                const trigger = document.querySelector('[value="users"]') as HTMLElement;
                trigger?.click();
              }}
            >
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-[10px] uppercase font-bold">Users</span>
            </Button>
          </div>

          <TabsList className="hidden">
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="lectures" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">{editingId && editingType === 'lecture' ? 'Edit Lecture' : 'Add New Lecture'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddLecture} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Title</Label>
                      <Input value={newL.title} onChange={e => setNewL({...newL, title: e.target.value})} placeholder="Lecture Title" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Subject</Label>
                      <select 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm"
                        value={newL.subject}
                        onChange={e => setNewL({...newL, subject: e.target.value as Subject})}
                      >
                        <option>Physics</option>
                        <option>Chemistry</option>
                        <option>Maths</option>
                        <option>Biology</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Topic</Label>
                      <Input value={newL.topic} onChange={e => setNewL({...newL, topic: e.target.value})} placeholder="Topic" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Drive Video Link</Label>
                      <Input value={newL.videoUrl} onChange={e => setNewL({...newL, videoUrl: e.target.value})} placeholder="https://drive.google.com/..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Description</Label>
                      <textarea 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm h-24"
                        value={newL.description}
                        onChange={e => setNewL({...newL, description: e.target.value})}
                        placeholder="Brief description..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId && editingType === 'lecture' ? 'Update' : 'Upload')}
                      </Button>
                      {editingId && editingType === 'lecture' && (
                        <Button type="button" variant="outline" onClick={resetLectureForm}>Cancel</Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="premium-card lg:col-span-2 flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">Existing Lectures</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {lectures.map(l => (
                        <div key={l.id} className="p-4 rounded-lg border border-border bg-secondary/20 flex justify-between items-start group">
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-[8px] uppercase">{l.subject}</Badge>
                              <Badge variant="outline" className="text-[8px] uppercase">{l.topic}</Badge>
                            </div>
                            <p className="text-sm font-bold">{l.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{l.description}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => startEditLecture(l)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteLecture(l.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">{editingId && editingType === 'quiz' ? 'Edit Quiz' : 'Create Quiz'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddQuiz} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Title</Label>
                      <Input value={newQuiz.title} onChange={e => setNewQuiz({...newQuiz, title: e.target.value})} placeholder="Quiz Title" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Subject</Label>
                      <select 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm"
                        value={newQuiz.subject}
                        onChange={e => setNewQuiz({...newQuiz, subject: e.target.value as Subject})}
                      >
                        <option>Physics</option>
                        <option>Chemistry</option>
                        <option>Maths</option>
                        <option>Biology</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Topic</Label>
                      <Input value={newQuiz.topic} onChange={e => setNewQuiz({...newQuiz, topic: e.target.value})} placeholder="Topic" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Selected Questions ({newQuiz.selectedQuestionIds.length})</Label>
                      <ScrollArea className="h-48 border border-border rounded-md p-2">
                        <div className="space-y-2">
                          {questions.filter(q => q.subject === newQuiz.subject).map(q => (
                            <div 
                              key={q.id} 
                              onClick={() => toggleQuestionSelection(q.id)}
                              className={`p-2 rounded text-xs cursor-pointer border transition-all ${newQuiz.selectedQuestionIds.includes(q.id) ? 'bg-primary/20 border-primary' : 'bg-secondary/20 border-transparent'}`}
                            >
                              <p className="line-clamp-2">{q.text}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId && editingType === 'quiz' ? 'Update' : 'Create')}
                      </Button>
                      {editingId && editingType === 'quiz' && (
                        <Button type="button" variant="outline" onClick={resetQuizForm}>Cancel</Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="premium-card lg:col-span-2 flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">Existing Quizzes</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {quizzes.map(q => (
                        <div key={q.id} className="p-4 rounded-lg border border-border bg-secondary/20 flex justify-between items-start group">
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-[8px] uppercase">{q.subject}</Badge>
                              <Badge variant="outline" className="text-[8px] uppercase">{q.topic}</Badge>
                              <Badge variant="outline" className="text-[8px] uppercase">{q.questions.length} Questions</Badge>
                            </div>
                            <p className="text-sm font-bold">{q.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{q.description}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => startEditQuiz(q)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteQuiz(q.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">{editingId && editingType === 'course' ? 'Edit Course' : 'Create Course'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCourse} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Title</Label>
                      <Input value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} placeholder="Course Title" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Subject</Label>
                      <select 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm"
                        value={newCourse.subject}
                        onChange={e => setNewCourse({...newCourse, subject: e.target.value as Subject})}
                      >
                        <option>Physics</option>
                        <option>Chemistry</option>
                        <option>Maths</option>
                        <option>Biology</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Select Lectures ({newCourse.lectureIds.length})</Label>
                      <ScrollArea className="h-32 border border-border rounded-md p-2">
                        <div className="space-y-2">
                          {lectures.filter(l => l.subject === newCourse.subject).map(l => (
                            <div 
                              key={l.id} 
                              onClick={() => toggleLectureSelection(l.id)}
                              className={`p-2 rounded text-xs cursor-pointer border transition-all ${newCourse.lectureIds.includes(l.id) ? 'bg-primary/20 border-primary' : 'bg-secondary/20 border-transparent'}`}
                            >
                              <p className="line-clamp-1">{l.title}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Select Quizzes ({newCourse.quizIds.length})</Label>
                      <ScrollArea className="h-32 border border-border rounded-md p-2">
                        <div className="space-y-2">
                          {quizzes.filter(q => q.subject === newCourse.subject).map(q => (
                            <div 
                              key={q.id} 
                              onClick={() => toggleQuizSelection(q.id)}
                              className={`p-2 rounded text-xs cursor-pointer border transition-all ${newCourse.quizIds.includes(q.id) ? 'bg-primary/20 border-primary' : 'bg-secondary/20 border-transparent'}`}
                            >
                              <p className="line-clamp-1">{q.title}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId && editingType === 'course' ? 'Update' : 'Create')}
                      </Button>
                      {editingId && editingType === 'course' && (
                        <Button type="button" variant="outline" onClick={resetCourseForm}>Cancel</Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="premium-card lg:col-span-2 flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">Existing Courses</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {courses.map(c => (
                        <div key={c.id} className="p-4 rounded-lg border border-border bg-secondary/20 flex justify-between items-start group">
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-[8px] uppercase">{c.subject}</Badge>
                              <Badge variant="outline" className="text-[8px] uppercase">{c.lectureIds.length} Lectures</Badge>
                              <Badge variant="outline" className="text-[8px] uppercase">{c.quizIds.length} Quizzes</Badge>
                            </div>
                            <p className="text-sm font-bold">{c.title}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => startEditCourse(c)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteCourse(c.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="flex-1 overflow-hidden">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">{editingId && editingType === 'question' ? 'Edit Question' : 'Add Question'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddQuestion} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Subject</Label>
                        <select 
                          className="w-full bg-background border border-border rounded-md p-2 text-sm"
                          value={newQ.subject}
                          onChange={e => setNewQ({...newQ, subject: e.target.value as Subject})}
                        >
                          <option>Physics</option>
                          <option>Chemistry</option>
                          <option>Maths</option>
                          <option>Biology</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Difficulty</Label>
                        <Input type="number" min="1" max="5" value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Topic</Label>
                      <Input value={newQ.topic} onChange={e => setNewQ({...newQ, topic: e.target.value})} placeholder="Topic" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Question Text</Label>
                      <textarea 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm h-24"
                        value={newQ.text}
                        onChange={e => setNewQ({...newQ, text: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {newQ.options.map((opt, i) => (
                        <Input 
                          key={i}
                          placeholder={`Option ${String.fromCharCode(65+i)}`}
                          value={opt}
                          onChange={e => {
                            const next = [...newQ.options];
                            next[i] = e.target.value;
                            setNewQ({...newQ, options: next});
                          }}
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Correct Answer</Label>
                      <Input value={newQ.correctAnswer} onChange={e => setNewQ({...newQ, correctAnswer: e.target.value})} placeholder="e.g. A" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId && editingType === 'question' ? 'Update' : 'Add')}
                      </Button>
                      {editingId && editingType === 'question' && (
                        <Button type="button" variant="outline" onClick={resetQuestionForm}>Cancel</Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="premium-card lg:col-span-2 flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">Question Bank</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {questions.map(q => (
                        <div key={q.id} className="p-4 rounded-lg border border-border bg-secondary/20 flex justify-between items-start group">
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-[8px] uppercase">{q.subject}</Badge>
                              <Badge variant="outline" className="text-[8px] uppercase">{q.topic}</Badge>
                            </div>
                            <p className="text-sm line-clamp-2">{q.text}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => startEditQuestion(q)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteQuestion(q.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
             </div>
          </TabsContent>
          <TabsContent value="users" className="flex-1 overflow-hidden">
            <Card className="premium-card h-full flex flex-col overflow-hidden">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest">User Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {users.map(u => (
                      <div key={u.uid} className="p-4 rounded-lg border border-border bg-secondary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold">{u.displayName || 'Anonymous'}</p>
                            <Badge variant={u.subscriptionStatus === 'active' ? 'default' : u.subscriptionStatus === 'pending' ? 'secondary' : 'outline'} className="text-[8px] uppercase">
                              {u.subscriptionStatus || 'none'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          {u.subscriptionStatus === 'pending' && (
                            <>
                              <Button size="sm" className="flex-1 sm:flex-none text-[10px] uppercase font-bold" onClick={() => handleApproveSubscription(u.uid)}>Approve</Button>
                              <Button size="sm" variant="destructive" className="flex-1 sm:flex-none text-[10px] uppercase font-bold" onClick={() => handleRejectSubscription(u.uid)}>Reject</Button>
                            </>
                          )}
                          {u.subscriptionStatus === 'active' && (
                            <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-[10px] uppercase font-bold" onClick={() => handleRejectSubscription(u.uid)}>Revoke</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
