import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong. Please try again.";
      
      try {
        // Check if it's a Firestore error JSON
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Database Error: ${parsed.error} during ${parsed.operationType} operation.`;
            if (parsed.error.includes('insufficient permissions')) {
              errorMessage = "You don't have permission to perform this action. Please check your account settings.";
            }
          }
        }
      } catch (e) {
        // Not a JSON error, use default or error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Oops! An error occurred</h1>
          <p className="text-zinc-500 text-sm max-w-xs mb-8 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-6 py-3 rounded-2xl hover:bg-zinc-800 transition-all font-bold"
          >
            <RefreshCcw className="w-4 h-4" />
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
