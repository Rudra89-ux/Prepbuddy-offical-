import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Info, Calendar, CheckCircle2, Loader2, Mic, Music, FileText, Download, ExternalLink } from 'lucide-react';
import { Lecture } from './types';
import { Badge } from '@/components/ui/badge';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';

export default function LecturePlayer({ lecture, onBack }: { lecture: Lecture, onBack: () => void }) {
  const { profile } = useAuth();
  const [completing, setCompleting] = useState(false);

  const isCompleted = profile?.completedResources?.includes(lecture.id);

  // Convert Drive link to embed or direct stream link if necessary
  const getMediaUrl = (url: string | undefined | null) => {
    if (!url) return undefined;
    if (url.includes('drive.google.com')) {
      // Extract ID from various Drive URL formats
      const match = url.match(/[-\w]{25,}/);
      const id = match ? match[0] : null;
      if (id) {
        // For both video and audio, the preview link is the most reliable in an iframe
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    }
    return url;
  };

  const handleMarkCompleted = async () => {
    if (!profile || isCompleted || completing) return;

    setCompleting(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        completedResources: arrayUnion(lecture.id)
      });
      toast.success('Resource marked as completed!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('Failed to update progress');
    } finally {
      setCompleting(false);
    }
  };

  const isDriveLink = lecture.type === 'audio' ? lecture.audioUrl?.includes('drive.google.com') : lecture.videoUrl?.includes('drive.google.com');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 border-b border-border flex items-center gap-4 bg-secondary/30 backdrop-blur-md sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-sm font-bold truncate max-w-[200px]">{lecture.title}</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{lecture.subject} • {lecture.topic}</p>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {lecture.type === 'audio' ? (
          <div className="space-y-6">
            <div className="w-full bg-secondary/20 rounded-3xl p-8 flex flex-col items-center justify-center gap-6 border border-border shadow-xl">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                <Mic className="w-12 h-12 text-primary" />
              </div>
              <div className="w-full space-y-4">
                <div className="flex items-center gap-2 justify-center text-muted-foreground">
                  <Music className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Audio Discussion</span>
                </div>
                {isDriveLink ? (
                  <div className="w-full h-20 rounded-xl overflow-hidden border border-border bg-black">
                    <iframe
                      src={getMediaUrl(lecture.audioUrl)}
                      className="w-full h-full"
                      allow="autoplay"
                    />
                  </div>
                ) : (
                  <audio 
                    controls 
                    className="w-full h-12"
                    src={getMediaUrl(lecture.audioUrl)}
                  >
                    Your browser does not support the audio element.
                  </audio>
                )}
              </div>
            </div>
          </div>
        ) : lecture.type === 'pdf' ? (
          <div className="space-y-6">
            <div className="w-full bg-secondary/20 rounded-3xl p-8 flex flex-col items-center justify-center gap-6 border border-border shadow-xl min-h-[400px]">
              <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <FileText className="w-12 h-12 text-yellow-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold uppercase tracking-tight">Study Notes</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">PDF Document Available</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                <Button 
                  className="flex-1 h-12 rounded-xl gap-2 font-bold uppercase text-xs"
                  onClick={() => window.open(lecture.pdfUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open PDF
                </Button>
                <a 
                  href={lecture.pdfUrl} 
                  download 
                  className="flex-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="w-full h-12 rounded-xl gap-2 font-bold uppercase text-xs">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </a>
              </div>
              <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-border bg-white hidden sm:block">
                <iframe
                  src={lecture.pdfUrl?.includes('drive.google.com') ? getMediaUrl(lecture.pdfUrl) : `${lecture.pdfUrl}#toolbar=0`}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-border shadow-2xl">
            <iframe
              src={getMediaUrl(lecture.videoUrl)}
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight">{lecture.title}</h2>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-[8px] uppercase">{lecture.subject}</Badge>
                <Badge variant="outline" className="text-[8px] uppercase">{lecture.topic}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">
                {new Date(lecture.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Info className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">About this resource</p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {lecture.description || "No description provided for this resource."}
            </p>
          </div>
        </div>
      </main>

      <footer className="p-6 border-t border-border bg-secondary/10">
        <Button 
          className={`w-full h-12 rounded-xl font-bold gap-2 transition-all ${isCompleted ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : ''}`}
          onClick={handleMarkCompleted}
          disabled={isCompleted || completing}
        >
          {completing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Mark as Completed
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
