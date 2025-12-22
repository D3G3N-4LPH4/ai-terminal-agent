import React from 'react';
import './ErrorBoundary.css';

/**
 * Error Boundary component to catch React component errors and prevent app crashes
 * Provides user-friendly error UI with Fenrir theming
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // Prevent infinite error loops (max 3 errors before forcing page reload)
    if (this.state.errorCount >= 2) {
      console.error('Multiple errors detected. Suggesting page reload.');
    }
  }

  handleReset = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    // Force page reload to clear all state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const showReload = errorCount >= 2;

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h1 className="error-boundary-title">Fenrir encountered an error</h1>
            <p className="error-boundary-message">
              {showReload
                ? 'Multiple errors detected. Please reload the page to reset the application.'
                : 'The application encountered an unexpected error. You can try to continue or reload the page.'}
            </p>

            <div className="error-boundary-actions">
              {!showReload && (
                <button
                  onClick={this.handleReset}
                  className="error-boundary-button error-boundary-button-primary"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="error-boundary-button error-boundary-button-secondary"
              >
                Reload Page
              </button>
            </div>

            {/* Error details for debugging (collapsible) */}
            <details className="error-boundary-details">
              <summary className="error-boundary-details-summary">
                Error Details (for debugging)
              </summary>
              <div className="error-boundary-details-content">
                <div className="error-boundary-error-message">
                  <strong>Error:</strong> {error && error.toString()}
                </div>
                {errorInfo && (
                  <div className="error-boundary-stack">
                    <strong>Component Stack:</strong>
                    <pre>{errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
