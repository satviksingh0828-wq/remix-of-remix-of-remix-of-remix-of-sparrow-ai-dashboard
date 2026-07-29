/**
 * TabErrorBoundary — wraps a single operations tab so a render crash
 * in that tab stays isolated and never takes down the whole page.
 */

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; label?: string; }
interface State { error: Error | null }

export class TabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(err: unknown): State {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }

  reset() { this.setState({ error: null }); }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-destructive/30 bg-destructive/5 py-16 px-6 text-center gap-4">
          <AlertTriangle className="size-8 text-destructive/60" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              {this.props.label ?? "This section"} encountered an error
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {error.message || "An unexpected error occurred."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => this.reset()}>
            <RefreshCw className="size-3.5 mr-1.5" /> Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
