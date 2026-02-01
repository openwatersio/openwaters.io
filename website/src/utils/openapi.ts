import { type openapi } from "@neaps/api";

// Infer types from the imported openapi spec
type OpenAPISpec = typeof openapi;
type Components = NonNullable<OpenAPISpec["components"]>;
type Parameters = NonNullable<Components["parameters"]>;
type ParameterObject = Parameters[keyof Parameters];

/**
 * Fetch OpenAPI spec from @neaps/api at build time
 */
export async function getOpenAPISpec(): Promise<OpenAPISpec> {
  const { openapi } = await import("@neaps/api");
  return openapi;
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

export function extractEndpoints(spec: OpenAPISpec): EndpointInfo[] {
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
        | readonly (ParameterObject | { readonly $ref: string })[]
        | undefined;

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
