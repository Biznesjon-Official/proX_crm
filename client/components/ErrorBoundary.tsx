import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-500/30 rounded-lg p-6 max-w-2xl w-full">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              ⚠️ JavaScript Xatoligi Aniqlandi
            </h1>
            
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded p-4">
                <h3 className="text-red-300 font-semibold mb-2">Xatolik:</h3>
                <p className="text-red-200 text-sm font-mono">
                  {this.state.error?.message || 'Noma\'lum xatolik'}
                </p>
              </div>

              {this.state.error?.stack && (
                <div className="bg-slate-700 border border-slate-600 rounded p-4">
                  <h3 className="text-gray-300 font-semibold mb-2">Stack Trace:</h3>
                  <pre className="text-gray-400 text-xs overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
                <h3 className="text-blue-300 font-semibold mb-2">Hal qilish yo'llari:</h3>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Browser cache ni tozalang (Ctrl+Shift+R)</li>
                  <li>• Browser ni qayta ishga tushiring</li>
                  <li>• Console da batafsil xatolikni ko'ring</li>
                  <li>• Agar muammo davom etsa, developerni xabardor qiling</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Sahifani Yangilash
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Dashboard ga O'tish
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;