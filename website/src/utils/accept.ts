// Proactive negotiation per RFC 9110 §12.5.1, for the two representations every
// page has: HTML (default) and Markdown (acceptmarkdown.com).

export const REPRESENTATIONS = ["text/html", "text/markdown"] as const;
export type Representation = (typeof REPRESENTATIONS)[number];

type Entry = { type: string; q: number; order: number };

const parse = (accept: string): Entry[] =>
  accept
    .split(",")
    .map((part, order) => {
      const [type, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim().split("="))
        .find(([k]) => k?.toLowerCase() === "q")?.[1];
      const parsed = q === undefined ? 1 : Number(q);
      return {
        type: type.trim().toLowerCase(),
        q: Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0,
        order,
      };
    })
    .filter((e) => e.type);

// Exact match beats text/*, which beats */*; among equal specificity, the first
// listed wins so a duplicated type is stable.
const specificity = (pattern: string, type: string) => {
  if (pattern === type) return 3;
  if (pattern === type.split("/")[0] + "/*") return 2;
  if (pattern === "*/*") return 1;
  return 0;
};

/** The q-value the client assigned to a type: 0 when unmatched or explicitly rejected. */
export function quality(accept: string | null, type: string): number {
  if (!accept?.trim()) return 1;
  let match: Entry | undefined;
  let matchSpecificity = 0;
  for (const entry of parse(accept)) {
    const s = specificity(entry.type, type);
    if (s > matchSpecificity) {
      match = entry;
      matchSpecificity = s;
    }
  }
  return match?.q ?? 0;
}

/**
 * Picks the representation to serve for an Accept header, or null when the client
 * accepts none of them (406). A missing or empty header means "no constraint".
 */
export function negotiate(accept: string | null): Representation | null {
  if (!accept?.trim()) return "text/html";
  const entries = parse(accept);

  let best: { type: Representation; q: number; order: number } | null = null;
  for (const type of REPRESENTATIONS) {
    let match: Entry | undefined;
    let matchSpecificity = 0;
    for (const entry of entries) {
      const s = specificity(entry.type, type);
      if (s > matchSpecificity) {
        match = entry;
        matchSpecificity = s;
      }
    }
    if (!match || match.q === 0) continue;
    // Ties go to whichever the client listed first; HTML wins when both come from
    // the same entry (e.g. */*) because REPRESENTATIONS lists it first.
    if (
      !best ||
      match.q > best.q ||
      (match.q === best.q && match.order < best.order)
    ) {
      best = { type, q: match.q, order: match.order };
    }
  }
  return best?.type ?? null;
}
