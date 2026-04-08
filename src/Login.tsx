import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldCheck, Trophy, Target, Mail, Lock, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success("Welcome back, Aspirant");
      } else {
        await signup(email, password);
        toast.success("Elite account created");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await login();
      toast.success("Welcome to the Arena");
    } catch (error: any) {
      toast.error(error.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4"
          >
            <ShieldCheck className="w-3 h-3" />
            Your Personal Study Companion
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter leading-none">
            PREP<span className="text-primary/50">BUDDY</span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em]">
            Master Your Exams
          </p>
        </div>

        <div className="premium-card p-8 space-y-6 bg-secondary/50 backdrop-blur-xl border-border/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="student@prepbuddy.com" 
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] uppercase tracking-widest text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all rounded-lg group"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-secondary px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 border-border/50 hover:bg-primary/5 transition-all"
          >
            Google Sign In
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {isLogin ? "New here?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold hover:underline underline-offset-4"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 opacity-50">
          <Feature icon={<BookOpen className="w-3 h-3" />} label="Video Lectures" />
          <Feature icon={<Zap className="w-3 h-3" />} label="AI Mentorship" />
        </div>
      </motion.div>

      {/* Footer Quote */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-[0.3em]">
          "Precision. Speed. Dominance."
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="text-primary">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}
