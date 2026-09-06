import { marked } from "marked";

/** Render a markdown string (OpenAPI summaries and descriptions) to HTML. */
export function md(text: string): string {
  return marked.parse(text, { async: false });
}

/** Inline variant for table cells: no enclosing paragraph. */
export function mdInline(text: string): string {
  return marked.parseInline(text, { async: false });
}
