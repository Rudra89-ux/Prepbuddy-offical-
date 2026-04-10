import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, Trophy, Loader2 } from 'lucide-react';
import { Quiz, QuizAttempt } from './types';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType, serverTimestamp } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { MarkdownRenderer } from './components/MarkdownRenderer';

export default function QuizPlayer({ quiz, onBack }: { quiz: Quiz, onBack: () => void }) {
  const { user } = useAuth();
  const [shuffledQuestions, setShuffledQuestions] = useState(quiz.questions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);

  useEffect(() => {
    // Shuffle questions on mount
    const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
  }, [quiz.id]);

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

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

  const handleOptionSelect = (letter: string) => {
    if (isSubmitted) return;
    setSelectedOption(letter);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
    if (selectedOption?.trim().toUpperCase() === currentQuestion.correctAnswer?.trim().toUpperCase()) {
      setScore(prev => prev + 1);
    }
    // Quiz marking: +1 correct, 0 incorrect (already handled by only incrementing on correct)
  };

  const handleNext = async () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setSubmittingAttempt(true);
      try {
        await saveAttempt();
        setIsFinished(true);
      } finally {
        setSubmittingAttempt(false);
      }
    }
  };

  const saveAttempt = async () => {
    if (!user) {
      toast.error("User not authenticated. Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const attempt: Omit<QuizAttempt, 'id'> = {
        userId: user.uid,
        quizId: quiz.id,
        score: score,
        totalQuestions: shuffledQuestions.length,
        subject: quiz.subject,
        topic: quiz.topic,
        completedAt: serverTimestamp()
      };
      console.log("Submitting quiz attempt:", attempt);
      await addDoc(collection(db, 'quizAttempts'), attempt);
      toast.success('Quiz progress saved!');
    } catch (error) {
      console.error("Quiz submission error:", error);
      handleFirestoreError(error, OperationType.CREATE, 'quizAttempts');
    } finally {
      setSaving(false);
    }
  };

  if (isFinished) {
    const finalScore = score;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="p-6 bg-primary/10 rounded-full"
        >
          <Trophy className="w-20 h-20 text-primary" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Quiz Completed!</h2>
          <p className="text-muted-foreground uppercase tracking-widest text-xs">Great job on finishing {quiz.title}</p>
        </div>
        <div className="text-6xl font-black text-primary">
          {finalScore} / {shuffledQuestions.length}
        </div>
        <Button onClick={onBack} className="w-full max-w-xs h-12 rounded-xl font-bold uppercase">
          Back to Quizzes
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b border-border flex items-center justify-between bg-secondary/30 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-bold truncate max-w-[150px]">{quiz.title}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Question {currentQuestionIndex + 1} of {shuffledQuestions.length}</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
          <span className="text-xs font-black text-primary">SCORE: {score}</span>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-secondary/20 border border-border space-y-4">
            <div className="text-lg font-bold leading-tight">
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
              {currentQuestion.options?.map((option, i) => {
                const optionLetter = String.fromCharCode(65 + i);
                const isCorrect = optionLetter.toUpperCase() === currentQuestion.correctAnswer?.toUpperCase();
                const isSelected = selectedOption?.toUpperCase() === optionLetter.toUpperCase();
                
                let variantClass = "border-border bg-secondary/10";
                if (isSubmitted) {
                  if (isCorrect) variantClass = "border-green-500 bg-green-500/10 text-green-500";
                  else if (isSelected) variantClass = "border-red-500 bg-red-500/10 text-red-500";
                } else if (isSelected) {
                  variantClass = "border-primary bg-primary/10 text-primary";
                }

                return (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOptionSelect(optionLetter)}
                    className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all ${variantClass}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {optionLetter}
                    </div>
                    <div className="text-sm font-medium">
                      <MarkdownRenderer content={option} />
                    </div>
                    {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 ml-auto text-green-500" />}
                    {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 ml-auto text-red-500" />}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Your Answer (Numerical)</Label>
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder="Enter numerical value..." 
                  className={`h-16 text-xl font-bold rounded-2xl px-6 ${
                    isSubmitted 
                      ? selectedOption === currentQuestion.correctAnswer 
                        ? 'border-green-500 bg-green-500/5 text-green-500' 
                        : 'border-red-500 bg-red-500/5 text-red-500'
                      : 'border-border bg-secondary/10 focus:border-primary'
                  }`}
                  value={selectedOption || ''}
                  onChange={(e) => !isSubmitted && setSelectedOption(e.target.value)}
                  disabled={isSubmitted}
                />
                {isSubmitted && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {selectedOption === currentQuestion.correctAnswer ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-green-500">Correct: {currentQuestion.correctAnswer}</span>
                        <XCircle className="w-6 h-6 text-red-500" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isSubmitted && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2"
            >
              <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Explanation</p>
              <div className="text-xs text-foreground/80 leading-relaxed">
                <MarkdownRenderer content={currentQuestion.explanation} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-6 border-t border-border bg-secondary/10">
        {!isSubmitted ? (
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedOption}
            className="w-full h-12 rounded-xl font-bold uppercase"
          >
            Submit Answer
          </Button>
        ) : (
          <Button 
            onClick={handleNext} 
            disabled={submittingAttempt}
            className="w-full h-12 rounded-xl font-bold uppercase gap-2"
          >
            {submittingAttempt ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {currentQuestionIndex < shuffledQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </footer>
    </div>
  );
}
