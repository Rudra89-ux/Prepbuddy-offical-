import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, CreditCard, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function Checkout() {
  const { profile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('4,999');

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const docRef = doc(db, 'config', 'subscription');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPrice(docSnap.data().price);
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      }
    };
    fetchPrice();
  }, []);

  const handlePurchase = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // In a real app, this would redirect to Stripe/Razorpay
      // Here we simulate a payment request that needs admin approval
      await updateDoc(doc(db, 'users', profile.uid), {
        subscriptionStatus: 'pending'
      });
      toast.success("Payment request submitted!", {
        description: "An administrator will verify your payment and activate your account shortly."
      });
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (profile?.subscriptionStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="p-4 bg-yellow-500/10 rounded-full">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tighter uppercase">Payment Pending</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            We've received your payment request. An administrator is currently verifying it. You'll gain full access once approved.
          </p>
        </div>
        <Button variant="outline" onClick={logout} className="uppercase font-bold">Sign Out</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic">Unlock Prepbuddy Elite</h1>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">The only tool you need for JEE/NEET success</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="premium-card border-primary/20 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <Badge className="bg-primary text-primary-foreground uppercase text-[10px] font-black">Yearly Plan</Badge>
          </div>
          
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-5xl font-black tracking-tighter italic">₹{price}<span className="text-sm font-normal not-italic text-muted-foreground">/year</span></CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Feature item="Full Access to All Courses" />
              <Feature item="Standard Study Mentor Support" />
              <Feature item="Detailed Performance Reports" />
              <Feature item="Elite Question Bank (10,000+ Qs)" />
              <Feature item="Priority Admin Support" />
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={handlePurchase} 
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-lg uppercase italic hover:scale-[1.02] transition-transform"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Purchase Now"}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">Secure Payment • Instant Activation (Post-Approval)</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex gap-8 opacity-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] uppercase font-bold">Verified</span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          <span className="text-[10px] uppercase font-bold">Secure</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span className="text-[10px] uppercase font-bold">Elite</span>
        </div>
      </div>

      <Button variant="ghost" onClick={logout} className="text-xs uppercase font-bold text-muted-foreground">Sign Out</Button>
    </div>
  );
}

function Feature({ item }: { item: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
      <span className="text-sm font-medium">{item}</span>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${className}`}>
      {children}
    </div>
  );
}
