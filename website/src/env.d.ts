/// <reference path="../.astro/types.d.ts" />

declare module "virtual:station-redirects" {
  const targets: import("./utils/station-redirects").Targets;
  export default targets;
}
