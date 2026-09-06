/// <reference path="../.astro/types.d.ts" />

declare module "virtual:ais-openapi" {
  /** The spec at AIS_OPENAPI_FILE, or null when unset. */
  const spec: import("./utils/openapi").SpecDocument | null;
  export default spec;
}
