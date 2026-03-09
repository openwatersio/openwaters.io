import { Component, type ReactNode, useMemo } from "react";
import { NeapsProvider, TideStation, createQueryClient } from "@neaps/react";
import { hydrate, type DehydratedState } from "@tanstack/react-query";
import "@neaps/react/styles.css";
import { API_HOST } from "../../utils/constants";

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
  dehydratedState?: DehydratedState;
}

export function TideStationIsland({ id, dehydratedState }: Props) {
  const queryClient = useMemo(() => {
    const client = createQueryClient();
    if (dehydratedState) {
      hydrate(client, dehydratedState);
    }
    return client;
  }, [dehydratedState]);

  return (
    <ErrorBoundary>
      <NeapsProvider baseUrl={API_HOST} queryClient={queryClient}>
        <TideStation id={id} />
      </NeapsProvider>
    </ErrorBoundary>
  );
}
