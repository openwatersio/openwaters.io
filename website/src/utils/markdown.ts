import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
// Decoration and behaviour, not content.
// <noscript> stays: it is, by definition, the content for readers without JavaScript.
turndown.remove(["script", "style", "template", "button"]);
// data-nosnippet marks live widgets whose server-rendered placeholders are noise.
turndown.remove(
  (node) => node.nodeName === "SVG" || node.hasAttribute("data-nosnippet"),
);
// A link with nothing to say (a map preview, an icon-only button) is noise.
turndown.addRule("emptyLink", {
  filter: (node) => node.nodeName === "A" && !node.textContent?.trim(),
  replacement: () => "",
});
// Card links wrap whole blocks (heading, copy, call to action). Turndown would emit
// "[\n\n### Title...](href)"; instead keep the blocks and link the last line.
turndown.addRule("blockLink", {
  filter: (node) =>
    node.nodeName === "A" &&
    !!node.getAttribute("href") &&
    !!node.textContent?.trim() &&
    Array.from(node.childNodes).some((child) =>
      /^(H[1-6]|P|DIV|UL|OL|PRE|TABLE)$/.test((child as Node).nodeName),
    ),
  replacement: (content, node) => {
    const href = (node as HTMLElement).getAttribute("href");
    const lines = content.trim().split("\n");
    const last = lines.pop()!;
    return `\n\n${[...lines, `[${last}](${href})`].join("\n")}\n\n`;
  },
});

/** The Markdown representation of a built page: its <main> content. */
export function pageToMarkdown(html: string): string {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? html;
  return (
    turndown
      .turndown(main)
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}
