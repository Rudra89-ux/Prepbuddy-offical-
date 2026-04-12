import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, Exam } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSubAdmin: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (exam: Exam) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      // Clean up previous profile listener
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        // Check admin status from email first
        const adminEmails = ['rudrapable2010@gmail.com', 'leaninkclothing@gmail.com'];
        const subAdminEmails = ['xajinkya148@gmail.com'];
        
        setIsAdmin(adminEmails.includes(user.email || ''));
        setIsSubAdmin(subAdminEmails.includes(user.email || ''));
        
        const userRef = doc(db, 'users', user.uid);
        unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data() as UserProfile;
            
            // Force non-admins to have isSubscribed=false
            const isUserAdmin = adminEmails.includes(user.email || '') || data.role === 'admin';
            const isUserSubAdmin = subAdminEmails.includes(user.email || '') || data.role === 'sub-admin';
            
            if (!isUserAdmin && !isUserSubAdmin && data.isSubscribed) {
              data.isSubscribed = false;
            }
            
            setProfile(data);
            // Also check role from document
            if (data.role === 'admin') {
              setIsAdmin(true);
            }
            if (data.role === 'sub-admin') {
              setIsSubAdmin(true);
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const login = async (email?: string, password?: string) => {
    try {
      if (email && password) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw new Error("Email and password are required");
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const completeOnboarding = async (exam: Exam) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    
    // Check if user is admin based on email
    const adminEmails = ['rudrapable2010@gmail.com', 'leaninkclothing@gmail.com'];
    const subAdminEmails = ['xajinkya148@gmail.com'];
    const isUserAdmin = adminEmails.includes(user.email || '');
    const isUserSubAdmin = subAdminEmails.includes(user.email || '');

    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Student',
      photoURL: user.photoURL || '',
      exam,
      isSubscribed: isUserAdmin || isUserSubAdmin, // Admins and sub-admins get premium
      subscriptionStatus: (isUserAdmin || isUserSubAdmin) ? 'active' : 'none',
      role: isUserAdmin ? 'admin' : (isUserSubAdmin ? 'sub-admin' : 'student'),
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      completedResources: []
    };

    try {
      await setDoc(userRef, newProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSubAdmin, login, signup, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
