import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, Trophy, Loader2 } from 'lucide-react';
import { Quiz, QuizAttempt } from './types';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType, serverTimestamp } from './lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function QuizPlayer({ quiz, onBack }: { quiz: Quiz, onBack: () => void }) {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const handleOptionSelect = (option: string) => {
    if (isSubmitted) return;
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
    if (selectedOption === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setIsFinished(true);
      await saveAttempt();
    }
  };

  const saveAttempt = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const attempt: Omit<QuizAttempt, 'id'> = {
        userId: user.uid,
        quizId: quiz.id,
        score: score + (selectedOption === currentQuestion.correctAnswer ? 1 : 0),
        totalQuestions: quiz.questions.length,
        subject: quiz.subject,
        topic: quiz.topic,
        completedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'quizAttempts'), attempt);
      toast.success('Quiz progress saved!');
    } catch (error) {
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
          {finalScore} / {quiz.questions.length}
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
          <span className="text-xs font-black text-primary">SCORE: {score}</span>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-secondary/20 border border-border">
            <h2 className="text-lg font-bold leading-tight">{currentQuestion.text}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options?.map((option, i) => {
              const optionLetter = String.fromCharCode(65 + i);
              const isCorrect = optionLetter === currentQuestion.correctAnswer;
              const isSelected = selectedOption === optionLetter;
              
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
                  <span className="text-sm font-medium">{option}</span>
                  {isSubmitted && isCorrect && <CheckCircle2 className="w-5 h-5 ml-auto text-green-500" />}
                  {isSubmitted && isSelected && !isCorrect && <XCircle className="w-5 h-5 ml-auto text-red-500" />}
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {isSubmitted && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2"
            >
              <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Explanation</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{currentQuestion.explanation}</p>
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
            className="w-full h-12 rounded-xl font-bold uppercase gap-2"
          >
            {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </footer>
    </div>
  );
}
