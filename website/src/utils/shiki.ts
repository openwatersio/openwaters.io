import { createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export const SNIPPET_LANGS = ["js", "python", "go", "rust", "sh"] as const;

// One highlighter per process. Astro's <Code> loads each block's grammar with
// its own dynamic import while the page streams, which intermittently stalls
// the dev server mid-response.
let highlighter: Promise<Highlighter> | undefined;

export async function highlight(
  code: string,
  lang: (typeof SNIPPET_LANGS)[number],
) {
  const h = await (highlighter ??= createHighlighter({
    langs: [...SNIPPET_LANGS],
    themes: ["github-dark"],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }));
  return h.codeToHtml(code, {
    lang,
    theme: "github-dark",
    transformers: [
      {
        pre(node) {
          this.addClassToHast(
            node,
            "h-96 overflow-auto rounded-lg p-4 text-sm bg-navy-900! [tab-size:4]",
          );
        },
      },
    ],
  });
}
