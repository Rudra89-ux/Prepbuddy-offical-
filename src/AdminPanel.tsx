import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType, serverTimestamp } from './lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Trash2, Users, BookOpen, BarChart3, Loader2, Brain, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Question, Subject, QuestionType, Lecture, Quiz } from './types';

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  
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

  useEffect(() => {
    fetchQuestions();
    fetchLectures();
    fetchQuizzes();
  }, []);

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

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'questions'), newQ);
      toast.success("Question added");
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
      fetchQuestions();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'lectures'), {
        ...newL,
        createdAt: serverTimestamp()
      });
      toast.success("Lecture uploaded");
      setNewL({
        title: '',
        description: '',
        subject: 'Physics',
        topic: '',
        videoUrl: ''
      });
      fetchLectures();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lectures');
    } finally {
      setLoading(false);
    }
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
      await addDoc(collection(db, 'quizzes'), {
        title: newQuiz.title,
        description: newQuiz.description,
        subject: newQuiz.subject,
        topic: newQuiz.topic,
        questions: selectedQuestions,
        createdAt: serverTimestamp()
      });
      toast.success("Quiz created");
      setNewQuiz({
        title: '',
        description: '',
        subject: 'Physics',
        topic: '',
        selectedQuestionIds: []
      });
      fetchQuizzes();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'questions', id));
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
    }
  };

  const handleDeleteLecture = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lectures', id));
      toast.success("Lecture deleted");
      fetchLectures();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lectures/${id}`);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'quizzes', id));
      toast.success("Quiz deleted");
      fetchQuizzes();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${id}`);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setNewQuiz(prev => ({
      ...prev,
      selectedQuestionIds: prev.selectedQuestionIds.includes(id)
        ? prev.selectedQuestionIds.filter(qid => qid !== id)
        : [...prev.selectedQuestionIds, id]
    }));
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

      <main className="flex-1 p-6 overflow-hidden">
        <Tabs defaultValue="lectures" className="h-full flex flex-col">
          <TabsList className="bg-secondary/50 border border-border mb-6">
            <TabsTrigger value="lectures" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Lectures
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2">
              <Brain className="w-4 h-4" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <Plus className="w-4 h-4" />
              Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lectures" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">Add New Lecture</CardTitle>
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
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Lecture'}
                    </Button>
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteLecture(l.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                  <CardTitle className="text-sm uppercase tracking-widest">Create Quiz</CardTitle>
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
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Quiz'}
                    </Button>
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteQuiz(q.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
                  <CardTitle className="text-sm uppercase tracking-widest">Add Question</CardTitle>
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
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Question'}
                    </Button>
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteQuestion(q.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
             </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
