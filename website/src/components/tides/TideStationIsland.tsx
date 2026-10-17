import { Component, type ReactNode, useMemo } from "react";
import {
  SlackwaterProvider,
  TideStation,
  createQueryClient,
} from "@slackwater/react";
import { hydrate, type DehydratedState } from "@tanstack/react-query";
import "@slackwater/react/styles.css";
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
        <div className="callout text-alert rounded border p-4 text-sm">
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
      <SlackwaterProvider baseUrl={API_HOST} queryClient={queryClient}>
        <TideStation id={id} />
      </SlackwaterProvider>
    </ErrorBoundary>
  );
}
