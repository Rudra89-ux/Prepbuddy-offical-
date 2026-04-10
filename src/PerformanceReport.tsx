import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BarChart3, TrendingUp, TrendingDown, Lightbulb, ArrowLeft, FileText, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { QuizAttempt, MockTestAttempt } from './types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function PerformanceReport({ onBack }: { onBack: () => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [mockChartData, setMockChartData] = useState<any[]>([]);

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
      const qAttempts = query(collection(db, 'quizAttempts'), where('userId', '==', profile.uid), orderBy('completedAt', 'asc'));
      const snapshotAttempts = await getDocs(qAttempts);
      const attempts = snapshotAttempts.docs.map(doc => doc.data() as QuizAttempt);

      // Fetch mock test attempts
      const mAttempts = query(collection(db, 'mockTestAttempts'), where('userId', '==', profile.uid), orderBy('completedAt', 'asc'));
      const snapshotMockAttempts = await getDocs(mAttempts);
      const mockAttempts = snapshotMockAttempts.docs.map(doc => doc.data() as MockTestAttempt);

      // Prepare quiz chart data
      const quizData = attempts.map((a, i) => ({
        name: `Quiz ${i + 1}`,
        accuracy: Math.round((a.score / a.totalQuestions) * 100),
        score: a.score,
        total: a.totalQuestions
      }));
      setChartData(quizData);

      // Prepare mock test chart data
      const mockData = mockAttempts.map((a, i) => ({
        name: `Test ${i + 1}`,
        score: a.score,
        percentage: Math.round((a.score / (a.totalQuestions * 4)) * 100)
      }));
      setMockChartData(mockData);

      // Simple report logic
      const totalQuizzes = attempts.length;
      const avgScore = totalQuizzes > 0 
        ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions) * 100, 0) / totalQuizzes)
        : 0;

      const generatedReport = {
        summary: totalQuizzes > 0 
          ? `You have completed ${totalQuizzes} quizzes with an average accuracy of ${avgScore}%. Your performance trend shows ${quizData.length > 1 && quizData[quizData.length-1].accuracy >= quizData[quizData.length-2].accuracy ? 'improvement' : 'a need for more focus'} in recent attempts.`
          : "You haven't attempted any quizzes yet. Start practicing to see your performance analysis here.",
        strongestSubjects: attempts.length > 0 ? Array.from(new Set(attempts.filter(a => (a.score/a.totalQuestions) > 0.8).map(a => a.subject))).slice(0, 2) : ["Physics"],
        weakestSubjects: attempts.length > 0 ? Array.from(new Set(attempts.filter(a => (a.score/a.totalQuestions) < 0.5).map(a => a.subject))).slice(0, 2) : ["Chemistry"],
        topicAnalysis: attempts.slice(-5).reverse().map(a => ({
          subject: a.subject,
          topic: a.topic,
          score: `${Math.round((a.score / a.totalQuestions) * 100)}%`,
          status: (a.score / a.totalQuestions) > 0.7 ? 'strong' : 'improving'
        })),
        actionableAdvice: [
          { topic: "Consistency", advice: "Try to attempt at least one quiz daily to maintain your momentum." },
          { topic: "Revision", advice: "Review the questions you got wrong in your last 3 attempts." },
          { topic: "Mock Tests", advice: "Take a full-length mock test every weekend to build exam stamina." }
        ]
      };

      if (generatedReport.strongestSubjects.length === 0) generatedReport.strongestSubjects = ["Physics"];
      if (generatedReport.weakestSubjects.length === 0) generatedReport.weakestSubjects = ["Chemistry"];

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

      <main className="flex-1 p-6 space-y-8">
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

        {/* Charts Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-widest">Performance Trends</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="premium-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">Quiz Accuracy Trend (%)</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] p-0 pt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" hide />
                      <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                      />
                      <Area type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAccuracy)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] uppercase text-muted-foreground">Not enough data</div>
                )}
              </CardContent>
            </Card>

            <Card className="premium-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground">Mock Test Scores</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] p-0 pt-4">
                {mockChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" hide />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {mockChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.percentage > 70 ? '#22c55e' : entry.percentage > 40 ? 'hsl(var(--primary))' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] uppercase text-muted-foreground">Not enough data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

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
            Recent Quiz Performance
          </h3>
          <div className="space-y-3">
            {report.topicAnalysis.length > 0 ? report.topicAnalysis.map((item: any, i: number) => (
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
            )) : (
              <div className="p-8 text-center border border-dashed border-border rounded-3xl">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No quiz data available</p>
              </div>
            )}
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
