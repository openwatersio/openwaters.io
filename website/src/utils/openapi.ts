import { type openapi } from "@neaps/api";

// Infer types from the imported openapi spec
type OpenAPISpec = typeof openapi;
type Components = NonNullable<OpenAPISpec["components"]>;
type Parameters = NonNullable<Components["parameters"]>;
type ParameterObject = Parameters[keyof Parameters];

/**
 * Structural shape of an OpenAPI document as this site renders it: satisfied by
 * both the typed @neaps/api export and a spec fetched as JSON (the AIS
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
 * Path prefix where the neaps API is mounted in the Open Waters API.
 * Mirrors what neaps does internally with `servers: [{ url: prefix }]`.
 */
const NEAPS_PREFIX = "/tides";

export const AIS_OPENAPI_URL = "https://ais.openwaters.io/openapi.json";

/**
 * Fetch OpenAPI spec from @neaps/api at build time, prefixing paths with the
 * mount point used by the Open Waters API.
 */
export async function getOpenAPISpec(): Promise<OpenAPISpec> {
  const { openapi } = await import("@neaps/api");
  const paths = Object.fromEntries(
    Object.entries(openapi.paths).map(([path, pathItem]) => [
      path === "/" ? NEAPS_PREFIX : `${NEAPS_PREFIX}${path}`,
      pathItem,
    ]),
  );
  return { ...openapi, paths } as OpenAPISpec;
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
      const res = await fetch(url);
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
            const refPath = param.$ref.split("/").pop() as keyof Parameters;
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
 * The document served at /openapi.json: the mounted neaps spec, addressed at the
 * public API host so agents can call it without reading the docs page first.
 */
export async function openApiDocument(host: string) {
  const spec = await getOpenAPISpec();
  const paths = Object.fromEntries(
    Object.entries(spec.paths).map(([path, item]) => [
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
    ]),
  );
  return {
    ...spec,
    paths,
    info: {
      ...spec.info,
      title: "Open Waters API",
      // The AIS API lives on its own host with its own spec; point agents at it.
      description: `${spec.info.description.replace(/\.?$/, ".")} The AIS API is described separately at ${AIS_OPENAPI_URL}.`,
    },
    servers: [{ url: host }],
    // The API is open: an explicit empty requirement says so in-spec.
    security: [],
    externalDocs: { url: "https://openwaters.io/api/" },
  };
}

// Upstream neaps ships no operationIds (yet), so derive stable ones from the route:
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
