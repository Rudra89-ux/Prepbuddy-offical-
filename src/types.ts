export type Exam = 'JEE' | 'NEET';
export type Subject = 'Physics' | 'Chemistry' | 'Maths' | 'Biology';
export type QuestionType = 'MCQ' | 'Numerical';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  exam: Exam;
  isSubscribed: boolean;
  subscriptionStatus?: 'none' | 'pending' | 'active';
  role?: string;
  createdAt: any;
  lastActive: any;
  completedLectures: string[];
}

export interface Question {
  id: string;
  subject: Subject;
  topic: string;
  difficulty: number;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  type: QuestionType;
}

export interface Lecture {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  topic: string;
  videoUrl: string; // Drive link or similar
  createdAt: any;
}

export interface PerformanceRecord {
  userId: string;
  questionId: string;
  lastAttempted: any;
  nextReview: any;
  interval: number;
  easeFactor: number;
  correctCount: number;
  wrongCount: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  topic: string;
  questions: Question[];
  createdAt: any;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  subject: Subject;
  topic: string;
  completedAt: any;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  lectureIds: string[];
  quizIds: string[];
  createdAt: any;
}
