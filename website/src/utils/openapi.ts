import { type openapi, type currentsOpenapi } from "@slackwater/api";

// Infer types from the imported openapi specs
type OpenAPISpec = typeof openapi;
type ParametersOf<Spec extends { components: { parameters: object } }> =
  Spec["components"]["parameters"];
type TideParameters = ParametersOf<OpenAPISpec>;
type CurrentParameters = ParametersOf<typeof currentsOpenapi>;
type ParameterObject =
  | TideParameters[keyof TideParameters]
  | CurrentParameters[keyof CurrentParameters];

/**
 * Structural shape of an OpenAPI document as this site renders it: satisfied by
 * both the typed @slackwater/api export and a spec fetched as JSON (the AIS
 * server's).
 */
export interface SpecDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  tags?: readonly { name: string; description?: string }[];
  paths: Record<string, unknown>;
  components?: { parameters?: Record<string, ParameterObject> };
}

/**
 * Path prefixes where the Slackwater route groups are mounted in the Open Waters API.
 * Mirrors what slackwater does internally with `servers: [{ url: prefix }]`.
 */
export const TIDES_PREFIX = "/tides";
export const CURRENTS_PREFIX = "/currents";

export const AIS_OPENAPI_URL = "https://ais.openwaters.io/openapi.json";

/** A spec's paths, each prefixed with the mount point used by the Open Waters API. */
function mount<T extends { paths: Record<string, unknown> }>(
  spec: T,
  prefix: string,
): T {
  const paths = Object.fromEntries(
    Object.entries(spec.paths).map(([path, pathItem]) => [
      path === "/" ? prefix : `${prefix}${path}`,
      pathItem,
    ]),
  );
  return { ...spec, paths };
}

/** The tides spec from @slackwater/api, mounted at /tides. */
export async function getOpenAPISpec(): Promise<OpenAPISpec> {
  const { openapi } = await import("@slackwater/api");
  return mount(openapi, TIDES_PREFIX);
}

/** The tidal currents spec from @slackwater/api, mounted at /currents. */
export async function getCurrentsOpenAPISpec() {
  const { currentsOpenapi } = await import("@slackwater/api");
  return mount(currentsOpenapi, CURRENTS_PREFIX);
}

/**
 * The AIS API publishes its own spec. Fetched from production first (the
 * deployed server is the source of truth), with the repo copy as a fallback so
 * a server outage cannot fail a site build.
 */
const AIS_OPENAPI_URLS = [
  AIS_OPENAPI_URL,
  "https://raw.githubusercontent.com/openwatersio/aiscast/main/server/openapi.json",
];

export async function getAisOpenAPISpec(): Promise<SpecDocument> {
  for (const url of AIS_OPENAPI_URLS) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return (await res.json()) as SpecDocument;
      console.warn(`[ais] ${url}: ${res.status}`);
    } catch (err) {
      console.warn(`[ais] ${url}: ${err}`);
    }
  }
  throw new Error("AIS OpenAPI spec unavailable from every source");
}

/**
 * Extract endpoint information from OpenAPI spec
 */
export interface EndpointInfo {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters?: ParameterObject[];
  requestBody?: {
    readonly description?: string;
    readonly content?: Record<string, { schema?: unknown; example?: unknown }>;
    readonly required?: boolean;
  };
  responses: Record<
    string,
    {
      readonly description?: string;
      readonly content?: Record<
        string,
        { schema?: unknown; example?: unknown }
      >;
    }
  >;
  tags?: readonly string[];
}

export function extractEndpoints(spec: SpecDocument): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        !["get", "post", "put", "patch", "delete"].includes(
          method.toLowerCase(),
        )
      )
        continue;

      // Type guard for operation objects
      if (
        typeof operation !== "object" ||
        operation === null ||
        Array.isArray(operation)
      )
        continue;

      const op = operation as Record<string, unknown>;

      // Resolve parameter references
      const rawParams = op.parameters as
        readonly (ParameterObject | { readonly $ref: string })[] | undefined;

      const parameters = rawParams
        ?.map((param) => {
          if ("$ref" in param && typeof param.$ref === "string") {
            const refPath = param.$ref.split("/").pop()!;
            return spec.components?.parameters?.[refPath] ?? null;
          }
          return param as ParameterObject;
        })
        .filter((p): p is ParameterObject => p !== null);

      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: typeof op.summary === "string" ? op.summary : undefined,
        description:
          typeof op.description === "string" ? op.description : undefined,
        parameters,
        requestBody:
          op.requestBody &&
          typeof op.requestBody === "object" &&
          !("$ref" in op.requestBody)
            ? (op.requestBody as EndpointInfo["requestBody"])
            : undefined,
        responses:
          typeof op.responses === "object" && op.responses !== null
            ? (op.responses as EndpointInfo["responses"])
            : {},
        tags: Array.isArray(op.tags) ? (op.tags as string[]) : undefined,
      });
    }
  }

  return endpoints;
}

/** Stable anchor id for an endpoint, e.g. GET /v1/stations/{id} → get-v1-stations-id. */
export function endpointId(endpoint: EndpointInfo): string {
  return `${endpoint.method}-${endpoint.path}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Group endpoints by tag
 */
export function groupEndpointsByTag(
  endpoints: EndpointInfo[],
  defaultTag: string = "",
): Map<string, EndpointInfo[]> {
  const grouped = new Map<string, EndpointInfo[]>();

  for (const endpoint of endpoints) {
    const tag = endpoint.tags?.[0] || defaultTag;
    if (!grouped.has(tag)) {
      grouped.set(tag, []);
    }
    grouped.get(tag)!.push(endpoint);
  }

  return grouped;
}

/**
 * Union of two records that must agree on any key they share. The currents spec
 * reuses the tides spec's parameters and schemas by name, so a shared name with a
 * different definition would silently change one API's documented contract.
 */
export function mergeAgreeing<T>(
  kind: string,
  a: Record<string, T> = {},
  b: Record<string, T> = {},
): Record<string, T> {
  for (const [key, value] of Object.entries(b)) {
    if (key in a && JSON.stringify(a[key]) !== JSON.stringify(value)) {
      throw new Error(
        `openapi: tides and currents define ${kind} "${key}" differently`,
      );
    }
  }
  return { ...a, ...b };
}

type ComponentGroups = Record<string, Record<string, unknown>>;

/** Every component group of both specs, each merged with {@link mergeAgreeing}. */
function mergeComponents(a: object, b: object) {
  const tides = a as ComponentGroups;
  const currents = b as ComponentGroups;
  const kinds = new Set([...Object.keys(tides), ...Object.keys(currents)]);
  return Object.fromEntries(
    [...kinds].map((kind) => [
      kind,
      mergeAgreeing(kind, tides[kind], currents[kind]),
    ]),
  );
}

/**
 * The document served at /openapi.json: the mounted slackwater tides and currents
 * specs as one document, addressed at the public API host so agents can call it
 * without reading the docs pages first.
 */
export async function openApiDocument(host: string) {
  const [tides, currents] = await Promise.all([
    getOpenAPISpec(),
    getCurrentsOpenAPISpec(),
  ]);
  const paths = Object.fromEntries(
    Object.entries({ ...tides.paths, ...currents.paths }).map(
      ([path, item]) => [
        path,
        Object.fromEntries(
          Object.entries(item).map(([method, op]) => [
            method,
            {
              operationId: operationId(method, path),
              description: op.summary,
              ...op,
            },
          ]),
        ),
      ],
    ),
  );
  return {
    ...tides,
    paths,
    components: mergeComponents(tides.components, currents.components),
    info: {
      ...tides.info,
      title: "Open Waters API",
      // The AIS API lives on its own host with its own spec; point agents at it.
      description: `Tide predictions under ${TIDES_PREFIX} and tidal current predictions under ${CURRENTS_PREFIX}, from harmonic constituents. The AIS API is described separately at ${AIS_OPENAPI_URL}.`,
    },
    servers: [{ url: host }],
    // The API is open: an explicit empty requirement says so in-spec.
    security: [],
    externalDocs: { url: "https://openwaters.io/api/" },
  };
}

// Upstream slackwater ships no operationIds (yet), so derive stable ones from the route:
// GET /tides/stations/{source}/{id}/extremes -> getTidesStationsBySourceAndIdExtremes.
const operationId = (method: string, path: string) => {
  let id = method.toLowerCase();
  let params = 0;
  for (const segment of path.split("/").filter(Boolean)) {
    const param = segment.match(/^\{(.+)\}$/)?.[1];
    const word = (param ?? segment).replace(/\.json$/, "");
    if (param) id += params++ ? "And" : "By";
    id += word[0].toUpperCase() + word.slice(1);
  }
  return id;
};
