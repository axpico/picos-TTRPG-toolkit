import { Component, type ErrorInfo, type ReactNode } from "react";
import { EmptyState } from "./EmptyState.js";

interface Props {
  children: ReactNode;
  /** Custom fallback UI; defaults to a compact EmptyState with a retry button. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors in a subtree so one bad payload (e.g. a malformed
 * share-engine widget) doesn't white-screen the whole view.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <EmptyState
            compact
            icon="⚠️"
            title="Something went wrong"
            description="This section failed to render."
            action={
              <button className="btn-ghost" onClick={() => this.setState({ error: null })}>
                Try again
              </button>
            }
          />
        )
      );
    }
    return this.props.children;
  }
}
