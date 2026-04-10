export type Exam = 'JEE' | 'NEET';
export type Subject = 'Physics' | 'Chemistry' | 'Maths' | 'Biology' | 'Botany' | 'Zoology';
export type QuestionType = 'MCQ' | 'Numerical';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  exam: Exam;
  isSubscribed: boolean;
  subscriptionStatus?: 'none' | 'pending' | 'active';
  status?: 'active' | 'blocked';
  role?: string;
  createdAt: any;
  lastActive: any;
  completedResources: string[];
}

export interface Question {
  id: string;
  subject: Subject;
  difficulty: number;
  text: string;
  imageUrl?: string;
  imageLabel?: string;
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
  videoUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  type: 'video' | 'audio' | 'pdf';
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

export interface MockTest {
  id: string;
  title: string;
  description: string;
  exam: Exam;
  questions: Question[];
  durationMinutes: number;
  imageUrl?: string;
  createdAt: any;
}

export interface MockTestAttempt {
  id: string;
  userId: string;
  mockTestId: string;
  score: number;
  totalQuestions: number;
  subjectScores: Record<string, number>;
  completedAt: any;
  timeTakenSeconds: number;
}
