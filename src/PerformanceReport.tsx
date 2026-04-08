import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BarChart3, TrendingUp, TrendingDown, Lightbulb, ArrowLeft, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Lecture, QuizAttempt } from './types';

export default function PerformanceReport({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      fetchDataAndGenerateReport();
    }
  }, [profile]);

  const fetchDataAndGenerateReport = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Fetch quiz attempts
      const qAttempts = query(collection(db, 'quizAttempts'), where('userId', '==', profile.uid), orderBy('completedAt', 'desc'));
      const snapshotAttempts = await getDocs(qAttempts);
      const attempts = snapshotAttempts.docs.map(doc => doc.data() as QuizAttempt);

      // Simple report logic
      const totalQuizzes = attempts.length;
      const avgScore = totalQuizzes > 0 
        ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions) * 100, 0) / totalQuizzes)
        : 0;

      const generatedReport = {
        summary: totalQuizzes > 0 
          ? `You have completed ${totalQuizzes} quizzes with an average accuracy of ${avgScore}%. Keep practicing to improve your speed and accuracy.`
          : "You haven't attempted any quizzes yet. Start practicing to see your performance analysis here.",
        strongestSubjects: ["Physics", "Maths"], // Placeholder for now
        weakestSubjects: ["Chemistry", "Biology"], // Placeholder for now
        topicAnalysis: attempts.slice(0, 5).map(a => ({
          subject: a.subject,
          topic: a.topic,
          score: `${Math.round((a.score / a.totalQuestions) * 100)}%`,
          status: (a.score / a.totalQuestions) > 0.7 ? 'strong' : 'improving'
        })),
        actionableAdvice: [
          { topic: "Consistency", advice: "Try to attempt at least one quiz daily to maintain your momentum." },
          { topic: "Revision", advice: "Review the questions you got wrong in your last 3 attempts." }
        ]
      };
      setReport(generatedReport);
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center">
          <h2 className="text-xl font-black tracking-tighter uppercase">Analyzing Your Performance</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Crunching your data...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-muted-foreground">Failed to generate report. Please try again later.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b border-border bg-secondary/30 backdrop-blur-md sticky top-0 z-50 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-sm font-black tracking-tighter uppercase">Performance Report</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Elite Academic Analysis</p>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {/* Summary Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="premium-card bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Strong vs Weak Subjects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="premium-card border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2 text-green-600">
                <TrendingUp className="w-4 h-4" />
                Strongest Subjects
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {report.strongestSubjects.map((sub: string) => (
                <Badge key={sub} className="bg-green-500/20 text-green-700 border-green-500/30 uppercase text-[10px]">
                  {sub}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="premium-card border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2 text-red-600">
                <TrendingDown className="w-4 h-4" />
                Weakest Subjects
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {report.weakestSubjects.map((sub: string) => (
                <Badge key={sub} className="bg-red-500/20 text-red-700 border-red-500/30 uppercase text-[10px]">
                  {sub}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Topic Analysis */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Detailed Topic Analysis
          </h3>
          <div className="space-y-3">
            {report.topicAnalysis.map((item: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl border border-border bg-secondary/20 flex justify-between items-center">
                <div>
                  <div className="flex gap-2 mb-1">
                    <Badge variant="secondary" className="text-[8px] uppercase">{item.subject}</Badge>
                    <Badge variant={item.status === 'strong' ? 'default' : 'outline'} className={`text-[8px] uppercase ${item.status === 'strong' ? 'bg-green-500/20 text-green-600 border-green-500/20' : 'bg-red-500/20 text-red-600 border-red-500/20'}`}>
                      {item.status}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold">{item.topic}</h4>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tracking-tighter text-primary">{item.score}</p>
                  <p className="text-[8px] uppercase text-muted-foreground">Accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actionable Advice */}
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Actionable Advice
          </h3>
          <div className="space-y-4">
            {report.actionableAdvice.map((item: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">{item.topic}</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{item.advice}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="p-6 border-t border-border bg-secondary/10">
        <Button onClick={onBack} className="w-full h-12 rounded-xl font-bold uppercase">
          Return to Dashboard
        </Button>
      </footer>
    </div>
  );
}
