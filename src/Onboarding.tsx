import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Exam } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, ChevronRight, Sparkles, BookOpen, Brain } from 'lucide-react';

export default function Onboarding() {
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [exam, setExam] = useState<Exam | null>(null);

  const handleExamSelect = (selectedExam: Exam) => {
    setExam(selectedExam);
    setStep(2);
  };

  const handleFinish = () => {
    if (exam) completeOnboarding(exam);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter uppercase">PREPBUDDY</h1>
              <p className="text-muted-foreground">Select your target exam</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant="outline" 
                className="h-32 text-2xl font-black border-2 hover:border-primary transition-all rounded-2xl"
                onClick={() => handleExamSelect('JEE')}
              >
                JEE
              </Button>
              <Button 
                variant="outline" 
                className="h-32 text-2xl font-black border-2 hover:border-primary transition-all rounded-2xl"
                onClick={() => handleExamSelect('NEET')}
              >
                NEET
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <Card className="premium-card rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Profile Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Study Resources</p>
                    <p className="text-sm text-muted-foreground">Access video lectures, discussions, and notes.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">AI Study Mentor</p>
                    <p className="text-sm text-muted-foreground">Personalized guidance for your success.</p>
                  </div>
                </div>
                <Button className="w-full mt-6 group h-12 rounded-xl font-bold" onClick={handleFinish}>
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
