// Proactive negotiation per RFC 9110 §12.5.1, for the two representations every
// page has: HTML (default) and Markdown (acceptmarkdown.com).

export const REPRESENTATIONS = ["text/html", "text/markdown"] as const;
export type Representation = (typeof REPRESENTATIONS)[number];

const parse = (accept: string) =>
  accept.split(",").flatMap((part, order) => {
    const [type, ...params] = part.trim().split(";");
    const raw = params
      .map((p) => p.trim().split("="))
      .find(([k]) => k?.toLowerCase() === "q")?.[1];
    const q = raw === undefined ? 1 : Number(raw);
    return type.trim()
      ? [
          {
            type: type.trim().toLowerCase(),
            q: Number.isFinite(q) ? Math.min(1, Math.max(0, q)) : 0,
            order,
          },
        ]
      : [];
  });

// Exact match beats text/*, which beats */*.
const specificity = (pattern: string, type: string) =>
  pattern === type
    ? 3
    : pattern === type.split("/")[0] + "/*"
      ? 2
      : pattern === "*/*"
        ? 1
        : 0;

/** The q-value the client gave a type and where it listed it; q is 0 when unmatched or rejected. */
export function quality(
  accept: string | null,
  type: string,
): { q: number; order: number } {
  if (!accept?.trim()) return { q: 1, order: 0 };
  let best = { q: 0, order: 0, specificity: 0 };
  for (const entry of parse(accept)) {
    const s = specificity(entry.type, type);
    if (s > best.specificity)
      best = { q: entry.q, order: entry.order, specificity: s };
  }
  return best;
}

/**
 * Picks the representation to serve for an Accept header, or null when the client
 * accepts none of them (406). Highest q wins; ties go to whichever the client listed
 * first, then to HTML.
 */
export function negotiate(accept: string | null): Representation | null {
  let best: { type: Representation; q: number; order: number } | null = null;
  for (const type of REPRESENTATIONS) {
    const { q, order } = quality(accept, type);
    if (
      q > 0 &&
      (!best || q > best.q || (q === best.q && order < best.order))
    ) {
      best = { type, q, order };
    }
  }
  return best?.type ?? null;
}
