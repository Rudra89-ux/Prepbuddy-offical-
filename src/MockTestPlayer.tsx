import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Timer,
  AlertCircle,
  Loader2,
  Trophy
} from 'lucide-react';
import { MockTest, Question, MockTestAttempt } from './types';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { MarkdownRenderer } from './components/MarkdownRenderer';

export default function MockTestPlayer({ test, onBack }: { test: MockTest, onBack: () => void }) {
  const { profile } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(test.durationMinutes * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<MockTestAttempt | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) {
      if (timeLeft <= 0 && !isSubmitted) {
        handleSubmit(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = test.questions[currentQuestionIndex];

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

  const handleAnswer = (val: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: val });
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    
    if (!auto && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    if (!profile) {
      toast.error("User profile not found. Please refresh.");
      return;
    }

    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      let score = 0;
      const subjectScores: Record<string, number> = {};

      test.questions.forEach(q => {
        const isCorrect = answers[q.id]?.trim().toUpperCase() === q.correctAnswer?.trim().toUpperCase();
        if (isCorrect) {
          // Standard marking: +4 for correct
          score += 4;
          subjectScores[q.subject] = (subjectScores[q.subject] || 0) + 4;
        } else if (answers[q.id]) {
          // Wrong answer penalty
          if (q.type === 'MCQ') {
            const penalty = 1; // -1 penalty for MCQ
            score -= penalty;
            subjectScores[q.subject] = (subjectScores[q.subject] || 0) - penalty;
          }
        }
      });

      const attemptData: Omit<MockTestAttempt, 'id'> = {
        userId: profile.uid,
        mockTestId: test.id,
        score,
        totalQuestions: test.questions.length,
        subjectScores,
        completedAt: serverTimestamp(),
        timeTakenSeconds: (test.durationMinutes * 60) - timeLeft
      };

      console.log("Submitting mock test attempt:", attemptData);
      const docRef = await addDoc(collection(db, 'mockTestAttempts'), attemptData);
      setAttempt({ id: docRef.id, ...attemptData } as MockTestAttempt);
      setIsSubmitted(true);
      toast.success("Mock test submitted successfully!");
    } catch (error) {
      console.error("Mock test submission error:", error);
      handleFirestoreError(error, OperationType.CREATE, 'mockTestAttempts');
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted && attempt) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center space-y-8 overflow-y-auto py-12">
        {!showReview ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md text-center space-y-6"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Test Completed!</h1>
              <p className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">Results for {test.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="premium-card bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Score</p>
                  <p className="text-3xl font-black text-primary">
                    {attempt.score}
                    <span className="text-sm text-muted-foreground ml-1">/ {test.exam === 'JEE' ? '300' : '720'}</span>
                  </p>
                </CardContent>
              </Card>
              <Card className="premium-card">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Time Taken</p>
                  <p className="text-3xl font-black">{formatTime(attempt.timeTakenSeconds)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] uppercase font-black tracking-widest text-left ml-1">Subject Breakdown</h3>
              {Object.entries(attempt.subjectScores).map(([subject, score]) => (
                <div key={subject} className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-border">
                  <span className="text-xs font-bold uppercase">{subject}</span>
                  <span className="text-sm font-black">{score}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowReview(true)} variant="outline" className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest">
                Review Mistakes
              </Button>
              <Button onClick={onBack} className="w-full h-12 rounded-2xl font-bold uppercase tracking-widest">
                Back to Dashboard
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="w-full max-w-3xl space-y-8">
            <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md py-4 z-10 border-b border-border mb-6">
              <h2 className="text-xl font-black uppercase tracking-tighter">Review Test Mistakes</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowReview(false)} className="uppercase font-bold text-[10px]">Back to Result</Button>
            </div>
            
            <div className="space-y-8">
              {test.questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer?.trim().toUpperCase() === q.correctAnswer?.trim().toUpperCase();
                const isNotAnswered = !userAnswer;
                
                return (
                  <div key={idx} className={`p-6 rounded-3xl border ${isCorrect ? 'border-green-500/20 bg-green-500/5' : isNotAnswered ? 'border-border bg-secondary/5' : 'border-red-500/20 bg-red-500/5'} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="uppercase text-[8px]">{q.subject}</Badge>
                        <Badge variant={isCorrect ? "default" : isNotAnswered ? "secondary" : "destructive"} className="uppercase text-[8px]">
                          Question {idx + 1} - {isCorrect ? 'Correct' : isNotAnswered ? 'Not Answered' : 'Incorrect'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm font-bold">
                      <MarkdownRenderer content={q.text} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className={`p-3 rounded-xl border text-xs ${isCorrect ? 'border-green-500/50 bg-green-500/10' : isNotAnswered ? 'border-border bg-secondary/10' : 'border-red-500/50 bg-red-500/10'}`}>
                        <span className="font-black uppercase text-[8px] block mb-1">Your Answer:</span>
                        {userAnswer || 'Not Answered'}
                      </div>
                      <div className="p-3 rounded-xl border border-green-500/50 bg-green-500/10 text-xs">
                        <span className="font-black uppercase text-[8px] block mb-1">Correct Answer:</span>
                        {q.correctAnswer}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                      <p className="text-[8px] font-black uppercase text-blue-500 tracking-widest">Explanation</p>
                      <div className="text-[10px] text-foreground/80 leading-relaxed">
                        <MarkdownRenderer content={q.explanation} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button onClick={onBack} className="w-full h-12 rounded-2xl font-bold uppercase mt-8">
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b border-border flex items-center justify-between bg-secondary/30 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (window.confirm("Are you sure you want to exit? Your progress will be lost.")) {
              onBack();
            }
          }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-bold truncate max-w-[150px]">{test.title}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Question {currentQuestionIndex + 1} of {test.questions.length}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-sm transition-all duration-500 ${
            timeLeft < 300 
              ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse' 
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <Timer className={`w-5 h-5 ${timeLeft < 300 ? 'animate-bounce' : ''}`} />
                <span className="text-xl font-black tabular-nums tracking-tight">{formatTime(timeLeft)}</span>
              </div>
              <div className="w-32 h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                <motion.div 
                  className={`h-full ${timeLeft < 300 ? 'bg-red-500' : 'bg-primary'}`}
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / (test.durationMinutes * 60)) * 100}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <Card className="premium-card min-h-[300px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">{currentQuestion.subject}</Badge>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">{currentQuestion.type}</Badge>
            </CardHeader>
            <CardContent className="flex-1 p-6 space-y-8">
              <div className="space-y-4">
                <div className="text-lg font-medium leading-relaxed">
                  <MarkdownRenderer content={currentQuestion.text} />
                </div>
                {currentQuestion.imageUrl && (
                  <div className="space-y-2">
                    {currentQuestion.imageLabel && (
                      <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest text-center">
                        {currentQuestion.imageLabel}
                      </p>
                    )}
                    <div className="rounded-2xl overflow-hidden border border-border bg-background max-h-[300px] flex items-center justify-center">
                      <img 
                        src={getDirectImageUrl(currentQuestion.imageUrl)} 
                        alt={currentQuestion.imageLabel || "Question Diagram"} 
                        className="max-w-full max-h-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {currentQuestion.type === 'MCQ' ? (
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.options?.map((option, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(letter)}
                        className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                          answers[currentQuestion.id] === letter 
                            ? 'bg-primary border-primary text-primary-foreground shadow-lg scale-[1.02]' 
                            : 'bg-secondary/30 border-border hover:border-primary/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          answers[currentQuestion.id] === letter ? 'bg-white/20' : 'bg-secondary'
                        }`}>
                          {letter}
                        </div>
                        <div className="text-sm font-medium">
                          <MarkdownRenderer content={option} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Your Answer (Numerical)</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter numerical value..." 
                    className="h-14 text-lg font-bold rounded-2xl"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center gap-4">
            <Button 
              variant="outline" 
              className="h-12 px-6 rounded-2xl gap-2 font-bold uppercase text-[10px]"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            {currentQuestionIndex === test.questions.length - 1 ? (
              <Button 
                className="h-12 px-8 rounded-2xl gap-2 font-bold uppercase text-[10px] bg-green-600 hover:bg-green-700"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Submit Test
              </Button>
            ) : (
              <Button 
                className="h-12 px-6 rounded-2xl gap-2 font-bold uppercase text-[10px]"
                onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <Card className="w-full lg:w-80 premium-card flex flex-col h-fit lg:sticky lg:top-24">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-[10px] uppercase tracking-widest">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {test.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-full aspect-square rounded-lg text-[10px] font-bold flex items-center justify-center transition-all ${
                    currentQuestionIndex === idx 
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : answers[q.id] 
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                        : 'bg-secondary/50 text-muted-foreground border border-border'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                <div className="w-3 h-3 rounded bg-secondary/50 border border-border" />
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-muted-foreground">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Current</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border border-border p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tighter">Submit Test?</h3>
                <p className="text-sm text-muted-foreground">Are you sure you want to submit your test? You have {formatTime(timeLeft)} remaining.</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 rounded-xl font-bold uppercase text-xs"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Continue Test
                </Button>
                <Button 
                  className="flex-1 h-12 rounded-xl font-bold uppercase text-xs"
                  onClick={() => handleSubmit(true)}
                >
                  Submit Now
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
