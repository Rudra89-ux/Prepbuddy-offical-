/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Onboarding from './Onboarding';
import Dashboard, { ViewType } from './Dashboard';
import { Toaster } from '@/components/ui/sonner';
import AdminPanel from './AdminPanel';

import LecturePlayer from './LecturePlayer';
import QuizPlayer from './QuizPlayer';
import MockTestPlayer from './MockTestPlayer';
import PerformanceReport from './PerformanceReport';
import Checkout from './Checkout';
import { Lecture, Quiz, MockTest } from './types';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function AppContent() {
  const { user, profile, loading, isAdmin, logout } = useAuth();
  const [view, setView] = useState<ViewType | 'player' | 'quiz-player' | 'mock-player' | 'report' | 'checkout'>('dashboard');
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [selectedMockTest, setSelectedMockTest] = useState<MockTest | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!profile) {
    return <Onboarding />;
  }

  if (profile.status === 'blocked') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h1>
          <p className="text-muted-foreground text-sm">Your account has been suspended by the administrator. Please contact support if you believe this is a mistake.</p>
          <Button variant="outline" onClick={() => logout()} className="uppercase font-bold text-xs">Sign Out</Button>
        </div>
      </div>
    );
  }

  // Subscription Check: If not admin and not active subscription, show checkout
  const isSubscribed = profile.subscriptionStatus === 'active' || isAdmin;

  if (!isSubscribed && !isAdmin) {
    return <Checkout />;
  }

  if (view === 'admin' && isAdmin) {
    return <AdminPanel onExit={() => setView('dashboard')} />;
  }

  if (view === 'player' && selectedLecture) {
    return <LecturePlayer lecture={selectedLecture} onBack={() => setView('dashboard')} />;
  }

  if (view === 'quiz-player' && selectedQuiz) {
    return <QuizPlayer quiz={selectedQuiz} onBack={() => setView('quizzes')} />;
  }

  if (view === 'mock-player' && selectedMockTest) {
    return <MockTestPlayer test={selectedMockTest} onBack={() => setView('mock-tests')} />;
  }

  if (view === 'report') {
    return <PerformanceReport onBack={() => setView('dashboard')} />;
  }

  return (
    <div className="relative min-h-screen bg-background">
      <Dashboard 
        onOpenAdmin={() => setView('admin')} 
        onSelectLecture={(lecture) => {
          setSelectedLecture(lecture);
          setView('player');
        }}
        onSelectQuiz={(quiz) => {
          setSelectedQuiz(quiz);
          setView('quiz-player');
        }}
        onSelectMockTest={(test) => {
          setSelectedMockTest(test);
          setView('mock-player');
        }}
        onOpenReport={() => setView('report')}
        currentView={view as ViewType}
        onViewChange={(v) => setView(v)}
      />
    </div>
  );
}

import ErrorBoundary from './ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
        <Toaster position="top-center" theme="dark" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
