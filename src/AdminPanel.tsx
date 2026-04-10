import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType, serverTimestamp } from './lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Plus, Trash2, Users, BookOpen, BarChart3, Loader2, Brain, CheckCircle2, Edit2, GraduationCap, Settings, XCircle, Mic, FileText, Upload, Trophy, ChevronDown, List } from 'lucide-react';
import { toast } from 'sonner';
import { Question, Subject, QuestionType, Lecture, Quiz, Course, UserProfile, MockTest, Exam } from './types';
import { storage, ref, uploadBytes, getDownloadURL } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { MarkdownRenderer } from './components/MarkdownRenderer';

export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resources');
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddSource, setQuickAddSource] = useState<'quiz' | 'mock-test' | null>(null);
  const [subPrice, setSubPrice] = useState('999');
  const [priceLoading, setPriceLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: string, title: string } | null>(null);
  const [qSearch, setQSearch] = useState('');
  const [qTopicFilter, setQTopicFilter] = useState('');
  const [isQuickCreateQuizOpen, setIsQuickCreateQuizOpen] = useState(false);
  const [isQuickCreateMockOpen, setIsQuickCreateMockOpen] = useState(false);
  const [quickCreateData, setQuickCreateData] = useState({ title: '', subject: 'Physics' as Subject, exam: 'JEE' as Exam });
  const [quizSearch, setQuizSearch] = useState('');
  const [mockSearch, setMockSearch] = useState('');
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'question' | 'lecture' | 'quiz' | 'course' | 'mock-test' | null>(null);

  // New Question Form
  const [newQ, setNewQ] = useState({
    subject: 'Physics' as Subject,
    difficulty: 1,
    text: '',
    imageUrl: '',
    imageLabel: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    type: 'MCQ' as QuestionType,
    targetQuizIds: [] as string[],
    targetMockTestIds: [] as string[]
  });

  // New Resource Form
  const [newL, setNewL] = useState({
    title: '',
    description: '',
    subject: 'Physics' as Subject,
    topic: '',
    videoUrl: '',
    audioUrl: '',
    pdfUrl: '',
    type: 'video' as 'video' | 'audio' | 'pdf'
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

  // New Mock Test Form
  const [newMockTest, setNewMockTest] = useState({
    title: '',
    description: '',
    exam: 'JEE' as Exam,
    durationMinutes: 180,
    imageUrl: '',
    selectedQuestionIds: [] as string[]
  });

  const [showMockQuestions, setShowMockQuestions] = useState(false);

  useEffect(() => {
    fetchQuestions();
    fetchLectures();
    fetchQuizzes();
    fetchCourses();
    fetchMockTests();
    fetchUsers();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'config'));
      const priceDoc = snapshot.docs.find(d => d.id === 'subscription');
      if (priceDoc) {
        setSubPrice(priceDoc.data().price || '999');
      }
    } catch (error) {
      console.error("Fetch config error:", error);
    }
  };

  const handleUpdatePrice = async () => {
    setPriceLoading(true);
    try {
      await setDoc(doc(db, 'config', 'subscription'), { price: subPrice });
      toast.success("Subscription price updated");
    } catch (error) {
      console.error("Update price error:", error);
      toast.error("Failed to update price");
    } finally {
      setPriceLoading(false);
    }
  };

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

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    return url;
  };

  const fetchLectures = async () => {
    try {
      const q = query(collection(db, 'lectures'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture));
      setLectures(fetched);
    } catch (error) {
      console.error("Fetch resources error:", error);
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

  const fetchMockTests = async () => {
    try {
      const q = query(collection(db, 'mockTests'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MockTest));
      setMockTests(fetched);
    } catch (error) {
      console.error("Fetch mock tests error:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `notes/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setNewL(prev => ({ ...prev, pdfUrl: url, type: 'pdf' }));
      toast.success("PDF uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `questions/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setNewQ(prev => ({ ...prev, imageUrl: url }));
      toast.success("Diagram uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload diagram");
    } finally {
      setUploading(false);
    }
  };

  const handleMockTestImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `mockTests/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setNewMockTest(prev => ({ ...prev, imageUrl: url }));
      toast.success("Mock test image uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleQuickCreateQuiz = async () => {
    if (!quickCreateData.title) {
      toast.error("Please enter a title");
      return;
    }
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'quizzes'), {
        title: quickCreateData.title,
        subject: quickCreateData.subject,
        topic: 'General',
        description: `Quiz for ${quickCreateData.title}`,
        questions: [],
        createdAt: serverTimestamp()
      });
      toast.success("Quiz created");
      fetchQuizzes();
      setNewQ(prev => ({ ...prev, targetQuizIds: [...prev.targetQuizIds, docRef.id] }));
      setIsQuickCreateQuizOpen(false);
      setQuickCreateData({ title: '', subject: 'Physics', exam: 'JEE' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCreateMock = async () => {
    if (!quickCreateData.title) {
      toast.error("Please enter a title");
      return;
    }
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'mockTests'), {
        title: quickCreateData.title,
        exam: quickCreateData.exam,
        durationMinutes: 180,
        description: `Mock test for ${quickCreateData.title}`,
        questions: [],
        imageUrl: '',
        createdAt: serverTimestamp()
      });
      toast.success("Mock test created");
      fetchMockTests();
      setNewQ(prev => ({ ...prev, targetMockTestIds: [...prev.targetMockTestIds, docRef.id] }));
      setIsQuickCreateMockOpen(false);
      setQuickCreateData({ title: '', subject: 'Physics', exam: 'JEE' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'mockTests');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const questionData = {
        subject: newQ.subject,
        difficulty: newQ.difficulty,
        text: newQ.text,
        imageUrl: newQ.imageUrl,
        imageLabel: newQ.imageLabel,
        options: newQ.options,
        correctAnswer: newQ.correctAnswer,
        explanation: newQ.explanation,
        type: newQ.type
      };

      let qId = editingId;
      if (editingId && editingType === 'question') {
        await updateDoc(doc(db, 'questions', editingId), questionData);
        toast.success("Question updated");
      } else {
        const docRef = await addDoc(collection(db, 'questions'), questionData);
        qId = docRef.id;
        toast.success("Question added");
        
        if (isQuickAddModalOpen && quickAddSource) {
          if (quickAddSource === 'quiz') {
            setNewQuiz(prev => ({
              ...prev,
              selectedQuestionIds: [...prev.selectedQuestionIds, qId]
            }));
          } else if (quickAddSource === 'mock-test') {
            setNewMockTest(prev => ({
              ...prev,
              selectedQuestionIds: [...prev.selectedQuestionIds, qId]
            }));
          }
          setIsQuickAddModalOpen(false);
          setQuickAddSource(null);
        }
      }

      // Update target quizzes
      for (const quizId of newQ.targetQuizIds) {
        const quiz = quizzes.find(qz => qz.id === quizId);
        if (quiz) {
          const updatedQuestions = [...quiz.questions];
          const qIndex = updatedQuestions.findIndex(q => q.id === qId);
          const fullQuestion = { ...questionData, id: qId } as Question;
          if (qIndex >= 0) {
            updatedQuestions[qIndex] = fullQuestion;
          } else {
            updatedQuestions.push(fullQuestion);
          }
          await updateDoc(doc(db, 'quizzes', quizId), { questions: updatedQuestions });
        }
      }

      // Update target mock tests
      for (const testId of newQ.targetMockTestIds) {
        const test = mockTests.find(t => t.id === testId);
        if (test) {
          const updatedQuestions = [...test.questions];
          const qIndex = updatedQuestions.findIndex(q => q.id === qId);
          const fullQuestion = { ...questionData, id: qId } as Question;
          if (qIndex >= 0) {
            updatedQuestions[qIndex] = fullQuestion;
          } else {
            updatedQuestions.push(fullQuestion);
          }
          await updateDoc(doc(db, 'mockTests', testId), { questions: updatedQuestions });
        }
      }

      if (newQ.targetQuizIds.length > 0) fetchQuizzes();
      if (newQ.targetMockTestIds.length > 0) fetchMockTests();

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
      difficulty: 1,
      text: '',
      imageUrl: '',
      imageLabel: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      type: 'MCQ',
      targetQuizIds: [],
      targetMockTestIds: []
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
        toast.success("Resource updated");
      } else {
        await addDoc(collection(db, 'lectures'), {
          ...newL,
          createdAt: serverTimestamp()
        });
        toast.success("Resource uploaded");
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
      videoUrl: '',
      audioUrl: '',
      pdfUrl: '',
      type: 'video'
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
      toast.success("Resource deleted");
      fetchLectures();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lectures/${id}`);
    }
  };

  const handleAddMockTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMockTest.selectedQuestionIds.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    setLoading(true);
    try {
      const selectedQuestions = questions.filter(q => newMockTest.selectedQuestionIds.includes(q.id));
      const testData = {
        title: newMockTest.title,
        description: newMockTest.description,
        exam: newMockTest.exam,
        durationMinutes: newMockTest.durationMinutes,
        imageUrl: newMockTest.imageUrl,
        questions: selectedQuestions,
      };

      if (editingId && editingType === 'mock-test') {
        await updateDoc(doc(db, 'mockTests', editingId), testData);
        toast.success("Mock test updated");
      } else {
        await addDoc(collection(db, 'mockTests'), {
          ...testData,
          createdAt: serverTimestamp()
        });
        toast.success("Mock test created");
      }
      resetMockTestForm();
      fetchMockTests();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'mockTests');
    } finally {
      setLoading(false);
    }
  };

  const resetMockTestForm = () => {
    setNewMockTest({
      title: '',
      description: '',
      exam: 'JEE',
      durationMinutes: 180,
      imageUrl: '',
      selectedQuestionIds: []
    });
    setEditingId(null);
    setEditingType(null);
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

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'courses', id));
      toast.success("Course deleted");
      fetchCourses();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
    }
  };

  const handleDeleteMockTest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'mockTests', id));
      toast.success("Mock test deleted");
      fetchMockTests();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `mockTests/${id}`);
    }
  };

  const startEditQuestion = (q: Question) => {
    setEditingId(q.id);
    setEditingType('question');
    setNewQ({
      subject: q.subject,
      difficulty: q.difficulty,
      text: q.text,
      imageUrl: q.imageUrl || '',
      imageLabel: q.imageLabel || '',
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      type: q.type,
      targetQuizIds: quizzes.filter(qz => qz.questions.some(qq => qq.id === q.id)).map(qz => qz.id),
      targetMockTestIds: mockTests.filter(t => t.questions.some(qq => qq.id === q.id)).map(t => t.id)
    });
    setActiveTab('questions');
  };

  const startEditLecture = (l: Lecture) => {
    setEditingId(l.id);
    setEditingType('lecture');
    setNewL({
      title: l.title,
      description: l.description,
      subject: l.subject,
      topic: l.topic,
      videoUrl: l.videoUrl || '',
      audioUrl: l.audioUrl || '',
      pdfUrl: l.pdfUrl || '',
      type: l.type || 'video'
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

  const startEditMockTest = (t: MockTest) => {
    setEditingId(t.id);
    setEditingType('mock-test');
    setNewMockTest({
      title: t.title,
      description: t.description,
      exam: t.exam,
      durationMinutes: t.durationMinutes,
      imageUrl: t.imageUrl || '',
      selectedQuestionIds: t.questions.map(q => q.id)
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

  const toggleMockQuestionSelection = (id: string) => {
    setNewMockTest(prev => ({
      ...prev,
      selectedQuestionIds: prev.selectedQuestionIds.includes(id)
        ? prev.selectedQuestionIds.filter(qid => qid !== id)
        : [...prev.selectedQuestionIds, id]
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

  const handleToggleBlock = async (userId: string, currentStatus: string | undefined) => {
    try {
      const isBlocked = currentStatus === 'blocked';
      await updateDoc(doc(db, 'users', userId), {
        status: isBlocked ? 'active' : 'blocked'
      });
      toast.success(isBlocked ? "User unblocked" : "User blocked");
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    try {
      await deleteDoc(doc(db, 'config', configId));
      toast.success("Configuration deleted");
      fetchConfig();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `config/${configId}`);
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="grid grid-cols-2 sm:grid-cols-8 gap-2 mb-6">
            <Button 
              variant={activeTab === 'resources' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-primary/20 bg-primary/5 hover:bg-primary/10"
              onClick={() => setActiveTab('resources')}
            >
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="text-[10px] uppercase font-bold">Video Lectures</span>
            </Button>
            <Button 
              variant={activeTab === 'discussions' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10"
              onClick={() => {
                setActiveTab('discussions');
                setNewL({ ...newL, type: 'audio' });
              }}
            >
              <Mic className="w-5 h-5 text-pink-500" />
              <span className="text-[10px] uppercase font-bold text-center">Topic Discussion</span>
            </Button>
            <Button 
              variant={activeTab === 'notes' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10"
              onClick={() => {
                setActiveTab('notes');
                setNewL({ ...newL, type: 'pdf' });
              }}
            >
              <FileText className="w-5 h-5 text-yellow-500" />
              <span className="text-[10px] uppercase font-bold">Notes</span>
            </Button>
            <Button 
              variant={activeTab === 'quizzes' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
              onClick={() => setActiveTab('quizzes')}
            >
              <Brain className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] uppercase font-bold">Quizzes</span>
            </Button>
            <Button 
              variant={activeTab === 'courses' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10"
              onClick={() => setActiveTab('courses')}
            >
              <GraduationCap className="w-5 h-5 text-purple-500" />
              <span className="text-[10px] uppercase font-bold">Courses</span>
            </Button>
            <Button 
              variant={activeTab === 'mock-tests' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
              onClick={() => setActiveTab('mock-tests')}
            >
              <Trophy className="w-5 h-5 text-red-500" />
              <span className="text-[10px] uppercase font-bold">Mock Tests</span>
            </Button>
            <Button 
              variant={activeTab === 'questions' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10"
              onClick={() => setActiveTab('questions')}
            >
              <Plus className="w-5 h-5 text-orange-500" />
              <span className="text-[10px] uppercase font-bold">Questions</span>
            </Button>
            <Button 
              variant={activeTab === 'users' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
              onClick={() => setActiveTab('users')}
            >
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-[10px] uppercase font-bold">Users</span>
            </Button>
            <Button 
              variant={activeTab === 'settings' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1 border-gray-500/20 bg-gray-500/5 hover:bg-gray-500/10"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="text-[10px] uppercase font-bold">Settings</span>
            </Button>
          </div>

          <TabsList className="hidden">
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="discussions">Topic Discussion</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-widest">Existing Lectures</CardTitle>
                  <Badge variant="secondary">{lectures.filter(l => l.type === 'video' || !l.type).length} Video Files</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {lectures.filter(l => l.type === 'video' || !l.type).map(l => (
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
                              onClick={() => {
                                setEditingId(l.id);
                                setEditingType('lecture');
                                setNewL({
                                  title: l.title,
                                  description: l.description,
                                  subject: l.subject,
                                  topic: l.topic,
                                  videoUrl: l.videoUrl || '',
                                  audioUrl: l.audioUrl || '',
                                  pdfUrl: l.pdfUrl || '',
                                  type: l.type || 'video'
                                });
                                setActiveTab('lectures');
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-black hover:bg-black/10"
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

          <TabsContent value="discussions" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">{editingId && editingType === 'lecture' ? 'Edit Discussion' : 'Add Topic Discussion'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddLecture} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Title</Label>
                      <Input value={newL.title} onChange={e => setNewL({...newL, title: e.target.value, type: 'audio'})} placeholder="Discussion Title" />
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
                      <Input value={newL.topic} onChange={e => setNewL({...newL, topic: e.target.value})} placeholder="Topic Name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Audio URL</Label>
                      <Input value={newL.audioUrl} onChange={e => setNewL({...newL, audioUrl: e.target.value, type: 'audio'})} placeholder="Direct Audio Link" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Description</Label>
                      <textarea 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm min-h-[100px]"
                        value={newL.description}
                        onChange={e => setNewL({...newL, description: e.target.value})}
                        placeholder="Discussion Description"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading} className="flex-1 font-bold uppercase text-xs">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Update' : 'Upload Audio')}
                      </Button>
                      {editingId && (
                        <Button type="button" variant="outline" onClick={resetLectureForm} className="font-bold uppercase text-xs">Cancel</Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="premium-card lg:col-span-2 flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-widest">Existing Discussions</CardTitle>
                  <Badge variant="secondary">{lectures.filter(l => l.type === 'audio').length} Audio Files</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {lectures.filter(l => l.type === 'audio').map(l => (
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
                              onClick={() => {
                                setEditingId(l.id);
                                setEditingType('lecture');
                                setNewL({
                                  title: l.title,
                                  description: l.description,
                                  subject: l.subject,
                                  topic: l.topic,
                                  videoUrl: l.videoUrl || '',
                                  audioUrl: l.audioUrl || '',
                                  pdfUrl: l.pdfUrl || '',
                                  type: l.type
                                });
                                setActiveTab('discussions');
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-black hover:bg-black/10"
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

          <TabsContent value="notes" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">{editingId && editingType === 'lecture' ? 'Edit Note' : 'Add New Note'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddLecture} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Title</Label>
                      <Input value={newL.title} onChange={e => setNewL({...newL, title: e.target.value, type: 'pdf'})} placeholder="Note Title" />
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
                      <Label className="text-[10px] uppercase">PDF File (Upload or Link)</Label>
                      <div className="flex flex-col gap-2">
                        <Input 
                          type="file" 
                          accept=".pdf" 
                          onChange={handleFileUpload} 
                          className="text-xs"
                        />
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-[8px] uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or provide link</span>
                          </div>
                        </div>
                        <Input 
                          value={newL.pdfUrl} 
                          onChange={e => setNewL({...newL, pdfUrl: e.target.value, type: 'pdf'})} 
                          placeholder="Google Drive Link or PDF URL" 
                          className="text-xs"
                        />
                        {uploading && <div className="flex items-center gap-2 text-[10px] text-primary"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</div>}
                        {newL.pdfUrl && <div className="text-[10px] text-green-500 font-bold">✓ PDF Ready</div>}
                      </div>
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
                      <Button type="submit" className="flex-1" disabled={loading || uploading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId && editingType === 'lecture' ? 'Update' : 'Save Note')}
                      </Button>
                      {editingId && editingType === 'lecture' && (
                        <Button type="button" variant="outline" onClick={resetLectureForm}>Cancel</Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="premium-card lg:col-span-2 flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-widest">Existing Notes</CardTitle>
                  <Badge variant="secondary">{lectures.filter(l => l.type === 'pdf').length} PDF Files</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {lectures.filter(l => l.type === 'pdf').map(l => (
                        <div key={l.id} className="p-4 rounded-lg border border-border bg-secondary/20 flex justify-between items-start group">
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-[8px] uppercase">{l.subject}</Badge>
                              <Badge variant="outline" className="text-[8px] uppercase">{l.topic}</Badge>
                            </div>
                            <p className="text-sm font-bold">{l.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{l.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => {
                                setEditingId(l.id);
                                setEditingType('lecture');
                                setNewL({
                                  title: l.title,
                                  description: l.description,
                                  subject: l.subject,
                                  topic: l.topic,
                                  videoUrl: l.videoUrl || '',
                                  audioUrl: l.audioUrl || '',
                                  pdfUrl: l.pdfUrl || '',
                                  type: l.type
                                });
                                setActiveTab('notes');
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => setDeleteConfirm({ id: l.id, type: 'lecture', title: l.title })}
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
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] uppercase">Selected Questions ({newQuiz.selectedQuestionIds.length})</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[8px] uppercase gap-1"
                          onClick={() => {
                            setQuickAddSource('quiz');
                            setIsQuickAddModalOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3" /> New Question
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Search questions..." 
                            value={qSearch} 
                            onChange={e => setQSearch(e.target.value)}
                            className="h-8 text-[10px]"
                          />
                          <Input 
                            placeholder="Topic filter..." 
                            value={qTopicFilter} 
                            onChange={e => setQTopicFilter(e.target.value)}
                            className="h-8 text-[10px]"
                          />
                        </div>
                        <ScrollArea className="h-48 border border-border rounded-md p-2">
                          <div className="space-y-2">
                            {questions
                              .filter(q => q.subject === newQuiz.subject)
                              .filter(q => q.text.toLowerCase().includes(qSearch.toLowerCase()))
                              .filter(q => !qTopicFilter || (q.explanation && q.explanation.toLowerCase().includes(qTopicFilter.toLowerCase())) || (q.text.toLowerCase().includes(qTopicFilter.toLowerCase())))
                              .map(q => (
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
                          <div className="flex gap-2">
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
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => setDeleteConfirm({ id: q.id, type: 'quiz', title: q.title })}
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
                          <div className="flex gap-2">
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
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => setDeleteConfirm({ id: c.id, type: 'course', title: c.title })}
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

          <TabsContent value="mock-tests" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <Card className="premium-card h-fit">
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-widest">{editingId && editingType === 'mock-test' ? 'Edit Mock Test' : 'Create Mock Test'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddMockTest} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Title</Label>
                      <Input value={newMockTest.title} onChange={e => setNewMockTest({...newMockTest, title: e.target.value})} placeholder="Mock Test Title" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Exam</Label>
                      <select 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm"
                        value={newMockTest.exam}
                        onChange={e => setNewMockTest({...newMockTest, exam: e.target.value as Exam})}
                      >
                        <option value="JEE">JEE</option>
                        <option value="NEET">NEET</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Duration (Minutes)</Label>
                      <Input type="number" value={newMockTest.durationMinutes} onChange={e => setNewMockTest({...newMockTest, durationMinutes: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Description</Label>
                      <textarea 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm h-20"
                        value={newMockTest.description}
                        onChange={e => setNewMockTest({...newMockTest, description: e.target.value})}
                        placeholder="Brief description..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Mock Test Image (Optional)</Label>
                      <div className="flex items-center gap-4">
                        <Input type="file" accept="image/*" onChange={handleMockTestImageUpload} className="hidden" id="mock-test-image-upload" />
                        <Label htmlFor="mock-test-image-upload" className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border border-border rounded-md cursor-pointer hover:bg-secondary transition-colors text-xs">
                          <Upload className="w-4 h-4" /> {newMockTest.imageUrl ? 'Change Image' : 'Upload Image'}
                        </Label>
                        {newMockTest.imageUrl && (
                          <div className="relative w-12 h-12 rounded border border-border overflow-hidden">
                            <img src={newMockTest.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setNewMockTest({...newMockTest, imageUrl: ''})}
                              className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                      <p className="text-[10px] font-bold uppercase text-blue-500">Exam Structure Requirements</p>
                      <div className="grid grid-cols-2 gap-2 text-[9px] text-muted-foreground">
                        <div>
                          <p className="font-bold text-foreground">NEET (200 Qs):</p>
                          <ul className="list-disc ml-3">
                            <li>50 Physics</li>
                            <li>50 Chemistry</li>
                            <li>50 Biology</li>
                            <li>50 Botany</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-bold text-foreground">JEE (75 Qs):</p>
                          <ul className="list-disc ml-3">
                            <li>20 Obj + 5 Num (Physics)</li>
                            <li>20 Obj + 5 Num (Chem)</li>
                            <li>20 Obj + 5 Num (Maths)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] uppercase">Select Questions ({newMockTest.selectedQuestionIds.length})</Label>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => setShowMockQuestions(!showMockQuestions)}
                            title={showMockQuestions ? "Hide Questions" : "Show Previous Questions"}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${showMockQuestions ? 'rotate-180' : ''}`} />
                          </Button>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[8px] uppercase gap-1"
                          onClick={() => {
                            setQuickAddSource('mock-test');
                            setIsQuickAddModalOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3" /> New Question
                        </Button>
                      </div>
                      {showMockQuestions && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Search questions..." 
                              value={qSearch} 
                              onChange={e => setQSearch(e.target.value)}
                              className="h-8 text-[10px]"
                            />
                            <Input 
                              placeholder="Topic filter..." 
                              value={qTopicFilter} 
                              onChange={e => setQTopicFilter(e.target.value)}
                              className="h-8 text-[10px]"
                            />
                          </div>
                          <ScrollArea className="h-60 border border-border rounded-md p-2">
                            <div className="space-y-2">
                              {questions
                                .filter(q => q.text.toLowerCase().includes(qSearch.toLowerCase()))
                                .filter(q => !qTopicFilter || (q.explanation && q.explanation.toLowerCase().includes(qTopicFilter.toLowerCase())) || (q.text.toLowerCase().includes(qTopicFilter.toLowerCase())))
                                .map(q => (
                                  <div 
                                    key={q.id} 
                                    className={`p-2 rounded border cursor-pointer flex justify-between items-center transition-all ${
                                      newMockTest.selectedQuestionIds.includes(q.id) ? 'bg-primary/10 border-primary' : 'bg-secondary/20 border-border'
                                    }`}
                                    onClick={() => toggleMockQuestionSelection(q.id)}
                                  >
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-bold uppercase text-muted-foreground">{q.subject}</p>
                                      <p className="text-xs truncate">{q.text}</p>
                                    </div>
                                    {newMockTest.selectedQuestionIds.includes(q.id) && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                                  </div>
                                ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId && editingType === 'mock-test' ? 'Update' : 'Create')}
                      </Button>
                      {editingId && editingType === 'mock-test' && (
                        <Button type="button" variant="outline" onClick={resetMockTestForm}>Cancel</Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="premium-card lg:col-span-2 flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm uppercase tracking-widest">Existing Mock Tests</CardTitle>
                  <Badge variant="secondary">{mockTests.length} Tests</Badge>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-4">
                      {mockTests.map(t => (
                        <div key={t.id} className="p-4 rounded-lg border border-border bg-secondary/20 flex justify-between items-start group">
                          <div className="flex gap-4">
                            <div className="w-16 h-16 rounded-lg bg-background border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {t.imageUrl ? (
                                <img src={t.imageUrl} alt={t.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Trophy className="w-6 h-6 text-muted-foreground/20" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex gap-2">
                                <Badge variant="secondary" className="text-[8px] uppercase">{t.exam}</Badge>
                                <Badge variant="outline" className="text-[8px] uppercase">{t.durationMinutes} Mins</Badge>
                                <Badge variant="outline" className="text-[8px] uppercase">{t.questions.length} Qs</Badge>
                              </div>
                              <p className="text-sm font-bold">{t.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => startEditMockTest(t)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => setDeleteConfirm({ id: t.id, type: 'mock-test', title: t.title })}
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
                    <div className="grid grid-cols-3 gap-4">
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
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Type</Label>
                        <select 
                          className="w-full bg-background border border-border rounded-md p-2 text-sm"
                          value={newQ.type}
                          onChange={e => setNewQ({...newQ, type: e.target.value as QuestionType})}
                        >
                          <option value="MCQ">MCQ</option>
                          <option value="Numerical">Numerical</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] uppercase">Question Text</Label>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="xs" 
                            className="h-6 text-[8px] uppercase px-2"
                            onClick={() => setNewQ({...newQ, text: newQ.text + "\n\n| Column I | Column II |\n| :--- | :--- |\n| (A) Item 1 | (P) Item 3 |\n| (B) Item 2 | (Q) Item 4 |\n| (C) Item 3 | (R) Item 5 |\n| (D) Item 4 | (S) Item 6 |\n"})}
                          >
                            Match Template
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="xs" 
                            className="h-6 text-[8px] uppercase px-2"
                            onClick={() => setNewQ({...newQ, text: newQ.text + "\n\n* Item 1\n* Item 2\n* Item 3\n"})}
                          >
                            List Template
                          </Button>
                        </div>
                      </div>
                      <textarea 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm h-24"
                        value={newQ.text}
                        onChange={e => setNewQ({...newQ, text: e.target.value})}
                      />
                      {newQ.text && (
                        <div className="p-2 border border-border rounded bg-secondary/20 text-xs">
                          <p className="text-[8px] uppercase text-muted-foreground mb-1">Preview</p>
                          <MarkdownRenderer content={newQ.text} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Diagram URL / Drive Link (Optional)</Label>
                      <p className="text-[9px] text-muted-foreground italic mb-1">Note: Ensure Drive links are set to "Anyone with the link can view"</p>
                      <div className="space-y-2">
                        <Input 
                          placeholder="Paste image URL or Google Drive direct link..." 
                          value={newQ.imageUrl} 
                          onChange={e => {
                            let url = e.target.value;
                            // Helper to convert Drive links to direct links
                            if (url.includes('drive.google.com')) {
                              const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                              if (match && match[1]) {
                                // lh3 is much more reliable for direct embedding than uc?export=view
                                url = `https://lh3.googleusercontent.com/d/${match[1]}`;
                              }
                            }
                            setNewQ({...newQ, imageUrl: url});
                          }}
                          className="text-xs"
                        />
                        <Input 
                          placeholder="Diagram Name/Label (e.g. Figure 1.2)" 
                          value={newQ.imageLabel} 
                          onChange={e => setNewQ({...newQ, imageLabel: e.target.value})}
                          className="text-xs"
                        />
                        {newQ.imageUrl && (
                          <div className="relative w-20 h-20 rounded border border-border overflow-hidden group">
                            <img src={getDirectImageUrl(newQ.imageUrl)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setNewQ({...newQ, imageUrl: '', imageLabel: ''})}
                              className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {newQ.type === 'MCQ' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {newQ.options.map((opt, i) => (
                          <div key={i} className="space-y-1">
                            <Input 
                              placeholder={`Option ${String.fromCharCode(65+i)}`}
                              value={opt}
                              onChange={e => {
                                const next = [...newQ.options];
                                next[i] = e.target.value;
                                setNewQ({...newQ, options: next});
                              }}
                            />
                            {opt && (
                              <div className="p-1.5 border border-border rounded bg-secondary/10 text-[10px]">
                                <MarkdownRenderer content={opt} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Correct Answer (Value)</Label>
                        <Input 
                          value={newQ.correctAnswer} 
                          onChange={e => setNewQ({...newQ, correctAnswer: e.target.value})} 
                          placeholder="e.g. 42" 
                        />
                      </div>
                    )}

                    {newQ.type === 'MCQ' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Correct Answer</Label>
                        <Input value={newQ.correctAnswer} onChange={e => setNewQ({...newQ, correctAnswer: e.target.value.toUpperCase()})} placeholder="e.g. A" />
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-primary">
                        <List className="w-4 h-4" />
                        <h3 className="text-[10px] uppercase font-black tracking-widest">Add in List</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] uppercase text-muted-foreground">Target Quizzes</Label>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[8px] uppercase gap-1 text-primary"
                              onClick={() => {
                                setQuickCreateData({ ...quickCreateData, subject: newQ.subject });
                                setIsQuickCreateQuizOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3" /> New Quiz
                            </Button>
                          </div>
                          <select 
                            className="w-full bg-background border border-border rounded-md p-1.5 text-[10px] mb-2"
                            onChange={e => {
                              const val = e.target.value;
                              if (val && !newQ.targetQuizIds.includes(val)) {
                                setNewQ({...newQ, targetQuizIds: [...newQ.targetQuizIds, val]});
                              }
                            }}
                            value=""
                          >
                            <option value="" disabled>Quick Select Quiz...</option>
                            {quizzes.filter(qz => qz.subject === newQ.subject).map(qz => (
                              <option key={qz.id} value={qz.id}>{qz.title}</option>
                            ))}
                          </select>
                          <Input 
                            placeholder="Search quizzes..." 
                            value={quizSearch} 
                            onChange={e => setQuizSearch(e.target.value)}
                            className="h-7 text-[9px] mb-2"
                          />
                          <ScrollArea className="h-32 border border-border rounded-md p-2 bg-secondary/10">
                            <div className="space-y-1">
                              {quizzes
                                .filter(qz => qz.subject === newQ.subject)
                                .filter(qz => qz.title.toLowerCase().includes(quizSearch.toLowerCase()))
                                .map(qz => (
                                <div 
                                  key={qz.id}
                                  onClick={() => {
                                    const next = newQ.targetQuizIds.includes(qz.id)
                                      ? newQ.targetQuizIds.filter(id => id !== qz.id)
                                      : [...newQ.targetQuizIds, qz.id];
                                    setNewQ({...newQ, targetQuizIds: next});
                                  }}
                                  className={`p-2 rounded text-[10px] cursor-pointer border transition-all flex items-center justify-between ${newQ.targetQuizIds.includes(qz.id) ? 'bg-primary/20 border-primary' : 'bg-background/50 border-transparent'}`}
                                >
                                  <span className="truncate">{qz.title}</span>
                                  {newQ.targetQuizIds.includes(qz.id) && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                </div>
                              ))}
                              {quizzes.filter(qz => qz.subject === newQ.subject).length === 0 && (
                                <p className="text-[10px] text-muted-foreground text-center py-4">No {newQ.subject} quizzes found</p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] uppercase text-muted-foreground">Target Mock Tests</Label>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[8px] uppercase gap-1 text-primary"
                              onClick={() => setIsQuickCreateMockOpen(true)}
                            >
                              <Plus className="w-3 h-3" /> New Mock
                            </Button>
                          </div>
                          <select 
                            className="w-full bg-background border border-border rounded-md p-1.5 text-[10px] mb-2"
                            onChange={e => {
                              const val = e.target.value;
                              if (val && !newQ.targetMockTestIds.includes(val)) {
                                setNewQ({...newQ, targetMockTestIds: [...newQ.targetMockTestIds, val]});
                              }
                            }}
                            value=""
                          >
                            <option value="" disabled>Quick Select Mock...</option>
                            {mockTests.map(t => (
                              <option key={t.id} value={t.id}>[{t.exam}] {t.title}</option>
                            ))}
                          </select>
                          <Input 
                            placeholder="Search mock tests..." 
                            value={mockSearch} 
                            onChange={e => setMockSearch(e.target.value)}
                            className="h-7 text-[9px] mb-2"
                          />
                          <ScrollArea className="h-32 border border-border rounded-md p-2 bg-secondary/10">
                            <div className="space-y-1">
                              {mockTests
                                .filter(t => t.title.toLowerCase().includes(mockSearch.toLowerCase()))
                                .map(t => (
                                <div 
                                  key={t.id}
                                  onClick={() => {
                                    const next = newQ.targetMockTestIds.includes(t.id)
                                      ? newQ.targetMockTestIds.filter(id => id !== t.id)
                                      : [...newQ.targetMockTestIds, t.id];
                                    setNewQ({...newQ, targetMockTestIds: next});
                                  }}
                                  className={`p-2 rounded text-[10px] cursor-pointer border transition-all flex items-center justify-between ${newQ.targetMockTestIds.includes(t.id) ? 'bg-primary/20 border-primary' : 'bg-background/50 border-transparent'}`}
                                >
                                  <span className="truncate">[{t.exam}] {t.title}</span>
                                  {newQ.targetMockTestIds.includes(t.id) && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                </div>
                              ))}
                              {mockTests.length === 0 && (
                                <p className="text-[10px] text-muted-foreground text-center py-4">No mock tests found</p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
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
                              <Badge variant="outline" className="text-[8px] uppercase">{q.type}</Badge>
                              {q.imageUrl && (
                                <Badge variant="outline" className="text-[8px] uppercase text-primary border-primary/30">
                                  {q.imageLabel || 'Has Diagram'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm line-clamp-2">
                              <MarkdownRenderer content={q.text} />
                            </div>
                            {q.type === 'MCQ' && q.options && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {q.options.map((opt, idx) => (
                                  <div key={idx} className="text-[10px] p-1.5 bg-background/50 rounded border border-border/50 flex gap-2 items-center">
                                    <span className="font-bold text-primary/50">{String.fromCharCode(65 + idx)}:</span>
                                    <MarkdownRenderer content={opt} />
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === 'Numerical' && (
                              <div className="mt-2 p-1.5 bg-background/50 rounded border border-border/50 text-[10px]">
                                <span className="font-bold text-primary/50 uppercase">Numerical Answer:</span> {q.correctAnswer}
                              </div>
                            )}
                            {q.imageUrl && (
                              <div className="mt-2 rounded border border-border overflow-hidden w-20 h-20">
                                <img src={getDirectImageUrl(q.imageUrl)} alt={q.imageLabel || "Question Diagram"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
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
                              className="text-red-500 hover:bg-red-500/10"
                              onClick={() => setDeleteConfirm({ id: q.id, type: 'question', title: q.text.substring(0, 30) + '...' })}
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
                          <Button 
                            size="sm" 
                            variant={u.status === 'blocked' ? 'default' : 'outline'} 
                            className={`flex-1 sm:flex-none text-[10px] uppercase font-bold ${u.status === 'blocked' ? 'bg-red-600 hover:bg-red-700' : 'border-red-500 text-red-500 hover:bg-red-50'}`}
                            onClick={() => handleToggleBlock(u.uid, u.status)}
                          >
                            {u.status === 'blocked' ? 'Unblock' : 'Block'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="flex-1 sm:flex-none text-red-500 hover:bg-red-500/10"
                            onClick={() => setDeleteConfirm({ id: u.uid, type: 'user', title: u.email || u.displayName || 'Anonymous' })}
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
          </TabsContent>
          <TabsContent value="settings" className="flex-1 overflow-hidden">
            <Card className="premium-card h-fit max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-widest">App Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Yearly Subscription Price (₹)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={subPrice} 
                      onChange={e => setSubPrice(e.target.value)} 
                      placeholder="e.g. 999"
                      className="text-lg font-bold"
                    />
                    <Button onClick={handleUpdatePrice} disabled={priceLoading}>
                      {priceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                      onClick={() => setDeleteConfirm({ id: 'subscription', type: 'config', title: 'Subscription Price' })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">This price will be shown to users on the checkout page.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Quick Add Question Modal */}
      <AnimatePresence>
        {isQuickAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
                <h3 className="text-sm font-black uppercase tracking-widest">Quick Add Question</h3>
                <Button variant="ghost" size="icon" onClick={() => {
                  setIsQuickAddModalOpen(false);
                  setQuickAddSource(null);
                  resetQuestionForm();
                }}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 max-h-[80vh] overflow-y-auto">
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
                        <option>Botany</option>
                        <option>Zoology</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Type</Label>
                      <select 
                        className="w-full bg-background border border-border rounded-md p-2 text-sm"
                        value={newQ.type}
                        onChange={e => setNewQ({...newQ, type: e.target.value as QuestionType})}
                      >
                        <option value="MCQ">MCQ</option>
                        <option value="Numerical">Numerical</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] uppercase">Question Text</Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="xs" 
                          className="h-6 text-[8px] uppercase px-2"
                          onClick={() => setNewQ({...newQ, text: newQ.text + "\n\n| Column I | Column II |\n| :--- | :--- |\n| (A) Item 1 | (P) Item 3 |\n| (B) Item 2 | (Q) Item 4 |\n| (C) Item 3 | (R) Item 5 |\n| (D) Item 4 | (S) Item 6 |\n"})}
                        >
                          Match Template
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="xs" 
                          className="h-6 text-[8px] uppercase px-2"
                          onClick={() => setNewQ({...newQ, text: newQ.text + "\n\n* Item 1\n* Item 2\n* Item 3\n"})}
                        >
                          List Template
                        </Button>
                      </div>
                    </div>
                    <textarea 
                      className="w-full bg-background border border-border rounded-md p-2 text-sm h-24"
                      value={newQ.text}
                      onChange={e => setNewQ({...newQ, text: e.target.value})}
                      placeholder="Enter question text..."
                    />
                    {newQ.text && (
                      <div className="p-2 border border-border rounded bg-secondary/20 text-xs">
                        <p className="text-[8px] uppercase text-muted-foreground mb-1">Preview</p>
                        <MarkdownRenderer content={newQ.text} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase">Diagram URL / Drive Link (Optional)</Label>
                    <p className="text-[9px] text-muted-foreground italic mb-1">Note: Ensure Drive links are set to "Anyone with the link can view"</p>
                    <div className="space-y-2">
                      <Input 
                        placeholder="Paste image URL or Google Drive direct link..." 
                        value={newQ.imageUrl} 
                        onChange={e => {
                          let url = e.target.value;
                          if (url.includes('drive.google.com')) {
                            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                            if (match && match[1]) {
                              url = `https://lh3.googleusercontent.com/d/${match[1]}`;
                            }
                          }
                          setNewQ({...newQ, imageUrl: url});
                        }}
                        className="text-xs"
                      />
                      <Input 
                        placeholder="Diagram Name/Label (e.g. Figure 1.2)" 
                        value={newQ.imageLabel} 
                        onChange={e => setNewQ({...newQ, imageLabel: e.target.value})}
                        className="text-xs"
                      />
                      {newQ.imageUrl && (
                        <div className="relative w-16 h-16 rounded border border-border overflow-hidden group">
                          <img src={getDirectImageUrl(newQ.imageUrl)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setNewQ({...newQ, imageUrl: '', imageLabel: ''})}
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {newQ.type === 'MCQ' && (
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase">Options</Label>
                      {newQ.options.map((opt, idx) => {
                        const optionLetter = String.fromCharCode(65 + idx);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex gap-2">
                              <Input 
                                value={opt} 
                                onChange={e => {
                                  const next = [...newQ.options];
                                  next[idx] = e.target.value;
                                  setNewQ({...newQ, options: next});
                                }}
                                placeholder={`Option ${optionLetter}`}
                              />
                              <Button 
                                type="button"
                                variant={newQ.correctAnswer === optionLetter ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setNewQ({...newQ, correctAnswer: optionLetter})}
                              >
                                {optionLetter}
                              </Button>
                            </div>
                            {opt && (
                              <div className="p-1.5 border border-border rounded bg-secondary/10 text-[10px]">
                                <MarkdownRenderer content={opt} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {newQ.type === 'Numerical' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase">Correct Answer (Value)</Label>
                      <Input value={newQ.correctAnswer} onChange={e => setNewQ({...newQ, correctAnswer: e.target.value})} placeholder="e.g. 42" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase">Explanation</Label>
                    <textarea 
                      className="w-full bg-background border border-border rounded-md p-2 text-sm h-20"
                      value={newQ.explanation}
                      onChange={e => setNewQ({...newQ, explanation: e.target.value})}
                      placeholder="Explain the answer..."
                    />
                    {newQ.explanation && (
                      <div className="p-2 border border-border rounded bg-secondary/20 text-xs">
                        <p className="text-[8px] uppercase text-muted-foreground mb-1">Preview</p>
                        <MarkdownRenderer content={newQ.explanation} />
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Question & Select'}
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isQuickCreateQuizOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter">Quick Create Quiz</h3>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase">Quiz Title</Label>
                <Input 
                  value={quickCreateData.title} 
                  onChange={e => setQuickCreateData({...quickCreateData, title: e.target.value})} 
                  placeholder="e.g. Newton's Laws Quiz"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase">Subject</Label>
                <select 
                  className="w-full bg-background border border-border rounded-md p-2 text-sm"
                  value={quickCreateData.subject}
                  onChange={e => setQuickCreateData({...quickCreateData, subject: e.target.value as Subject})}
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Maths</option>
                  <option>Biology</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsQuickCreateQuizOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleQuickCreateQuiz} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQuickCreateMockOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-black uppercase tracking-tighter">Quick Create Mock Test</h3>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase">Test Title</Label>
                <Input 
                  value={quickCreateData.title} 
                  onChange={e => setQuickCreateData({...quickCreateData, title: e.target.value})} 
                  placeholder="e.g. JEE Main Full Test 1"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase">Exam</Label>
                <select 
                  className="w-full bg-background border border-border rounded-md p-2 text-sm"
                  value={quickCreateData.exam}
                  onChange={e => setQuickCreateData({...quickCreateData, exam: e.target.value as Exam})}
                >
                  <option value="JEE">JEE</option>
                  <option value="NEET">NEET</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsQuickCreateMockOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleQuickCreateMock} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-lg font-black uppercase tracking-tighter">Confirm Deletion</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-bold text-foreground">"{deleteConfirm.title}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={async () => {
                    const { id, type } = deleteConfirm;
                    if (type === 'question') await handleDeleteQuestion(id);
                    else if (type === 'lecture') await handleDeleteLecture(id);
                    else if (type === 'quiz') await handleDeleteQuiz(id);
                    else if (type === 'course') await handleDeleteCourse(id);
                    else if (type === 'mock-test') await handleDeleteMockTest(id);
                    else if (type === 'user') await handleDeleteUser(id);
                    else if (type === 'config') await handleDeleteConfig(id);
                    setDeleteConfirm(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
