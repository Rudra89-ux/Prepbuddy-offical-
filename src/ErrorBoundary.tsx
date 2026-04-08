import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tighter">System Malfunction</h1>
              <p className="text-muted-foreground text-sm">
                The elite arena encountered an unexpected error. This has been logged for the mentors.
              </p>
            </div>
            {this.state.error && (
              <pre className="p-4 bg-secondary rounded-lg text-[10px] font-mono text-left overflow-auto max-h-32 border border-border">
                {this.state.error.message}
              </pre>
            )}
            <Button 
              onClick={() => window.location.reload()}
              className="w-full h-12 font-bold flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Re-initialize Arena
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
