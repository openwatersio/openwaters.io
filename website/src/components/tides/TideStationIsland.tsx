import { Component, type ReactNode } from "react";
import { NeapsProvider, TideStation } from "@neaps/react";
import "@neaps/react/styles.css";
import { API_HOST } from "../../utils/constants";
import { preferredUnits } from "../../utils/units";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded border border-(--status-red-border) bg-(--status-red-bg) p-4 text-sm text-(--status-red-text)">
          <strong>Error loading tide station:</strong>{" "}
          {(this.state.error as Error).message}
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  id: string;
}

export function TideStationIsland({ id }: Props) {
  return (
    <ErrorBoundary>
      <NeapsProvider baseUrl={API_HOST} units={preferredUnits}>
        <TideStation id={id} />
      </NeapsProvider>
    </ErrorBoundary>
  );
}
