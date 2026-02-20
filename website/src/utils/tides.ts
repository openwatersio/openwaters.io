import type { Extreme as NeapsExtreme } from "@neaps/tide-predictor";

// JSON-serialized version of the neaps Extreme type (Date → string)
type Serialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

export type Extreme = Serialized<NeapsExtreme>;

export interface ExtremesResponse {
  datum: string;
  units: string;
  extremes: Extreme[];
}

export interface TimelineResponse {
  datum: string;
  units: string;
  timeline: { time: string; level: number }[];
}
