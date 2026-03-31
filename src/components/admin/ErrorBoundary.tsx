import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            An unexpected error occurred. Your data is safe — please refresh or try again.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline" className="gap-2">
              <RefreshCw size={14} /> Try Again
            </Button>
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw size={14} /> Refresh Page
            </Button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-left max-w-lg">
              <summary className="text-xs text-muted-foreground cursor-pointer">Technical details</summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
