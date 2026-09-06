import { marked, type Tokens } from "marked";

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const safeUrl = (href: string) =>
  /^(https?:|mailto:|\/(?!\/)|#)/i.test(href.trim()) ? href.trim() : null;

// The AIS spec is fetched over the network, so its markdown is data, not
// trusted HTML: raw tags are shown as text and links keep to http(s), mailto,
// and same-site paths.
marked.use({
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escape(text);
    },
    link({ href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      const url = safeUrl(href);
      if (!url) return text;
      const titleAttr = title ? ` title="${escape(title)}"` : "";
      return `<a href="${escape(url)}"${titleAttr}>${text}</a>`;
    },
    image({ href, title, text }: Tokens.Image) {
      const url = safeUrl(href);
      if (!url) return escape(text);
      const titleAttr = title ? ` title="${escape(title)}"` : "";
      return `<img src="${escape(url)}" alt="${escape(text)}"${titleAttr}>`;
    },
  },
});

/** Render a markdown string (OpenAPI summaries and descriptions) to HTML. */
export function md(text: string): string {
  return marked.parse(text, { async: false });
}

/** Inline variant for table cells: no enclosing paragraph. */
export function mdInline(text: string): string {
  return marked.parseInline(text, { async: false });
}
