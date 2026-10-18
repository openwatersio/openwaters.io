import assert from "node:assert/strict";
import { test } from "node:test";

import {
  changelogPath,
  cleanBody,
  filterTitle,
  headline,
  isPatch,
  localizeImages,
  summarize,
  toReleases,
  type GitHubRelease,
  type Source,
} from "./changelog.ts";

const release = (r: Partial<GitHubRelease>): GitHubRelease => ({
  tag_name: "v1.0.0",
  name: null,
  body: "- A change",
  html_url: "https://github.com/openwatersio/x/releases/tag/v1.0.0",
  published_at: "2026-10-10T19:51:00Z",
  prerelease: false,
  draft: false,
  ...r,
});

const source: Source = { repo: "almanac", project: "sky", name: "Almanac" };

test("toReleases: skips drafts and prereleases, titles by name and version", () => {
  const out = toReleases(source, [
    release({ tag_name: "v0.8.0" }),
    release({ tag_name: "v0.9.0-beta.1", prerelease: true }),
    release({ tag_name: "v0.9.0", draft: true }),
  ]);
  assert.deepEqual(
    out.map((r) => [r.id, r.title]),
    [["almanac-0-8-0", "Almanac 0.8.0"]],
  );
});

test("toReleases: a prefix selects tags and is stripped from the version", () => {
  const out = toReleases(
    { ...source, name: "Signal K AIS plugin", prefix: "signalk-plugin-" },
    [
      release({ tag_name: "signalk-plugin-v0.6.3" }),
      release({ tag_name: "v2" }),
    ],
  );
  assert.deepEqual(
    out.map((r) => r.title),
    ["Signal K AIS plugin 0.6.3"],
  );
});

test("toReleases: drops a release whose notes were only bot bumps", () => {
  const body = [
    "## What's Changed",
    "* Bump typescript from 6 to 7 by @dependabot[bot] in https://github.com/o/r/pull/9",
    "",
    "**Full Changelog**: https://github.com/o/r/compare/a...b",
  ].join("\n");
  assert.deepEqual(toReleases(source, [release({ body })]), []);
});

test("cleanBody: GitHub's generated notes keep only the PR link", () => {
  const body = [
    "## What's Changed",
    "* Add text search by @bkeepers in https://github.com/o/r/pull/12",
    "",
    "## New Contributors",
    "* @someone made their first contribution in https://github.com/o/r/pull/11",
  ].join("\r\n");
  assert.equal(
    cleanBody(body),
    "- Add text search ([#12](https://github.com/o/r/pull/12))",
  );
});

test("cleanBody: changesets lose the hash and thanks, and the PR link ends the first paragraph", () => {
  const body = [
    "### Minor Changes",
    "",
    "-   [#301](https://x/pull/301) [`d5f2c5e`](https://x/commit/d) Thanks [@bkeepers](https://github.com/bkeepers)! - Drop the CommonJS",
    "    builds.",
    "",
    "    A second paragraph.",
    "",
    "- Updated dependencies \\[[`355f696`](https://x/commit/3)]:",
    "  - neaps@0.4.0",
  ].join("\n");
  assert.equal(
    cleanBody(body),
    [
      "- Drop the CommonJS",
      "    builds. ([#301](https://x/pull/301))",
      "",
      "    A second paragraph.",
    ].join("\n"),
  );
});

test("cleanBody: stripFrom drops the section and everything after it", () => {
  const ios = { ...source, stripFrom: /^Worth testing:/m };
  assert.equal(
    cleanBody("· Nearby stations\n\nWorth testing: open a station.", ios),
    "- Nearby stations",
  );
});

test("toReleases: a grouped monorepo run becomes one entry with each change once", () => {
  const changeset = (pr: number, text: string) =>
    `### Minor Changes\n\n- [#${pr}](https://x/pull/${pr}) [\`abc1234\`](https://x/c) Thanks [@b](https://x/b)! - ${text}`;
  const out = toReleases(
    { repo: "slackwater", project: "tides", name: "Neaps", grouped: true },
    [
      release({
        tag_name: "@slackwater/engine@1.0.0",
        published_at: "2026-10-10T19:51:37Z",
        body: changeset(347, "Add currents"),
      }),
      release({
        tag_name: "slackwater@1.0.0",
        published_at: "2026-10-10T19:51:46Z",
        body: changeset(347, "Add currents"),
      }),
      release({
        tag_name: "@slackwater/api@1.0.0",
        published_at: "2026-10-10T19:51:43Z",
        body: changeset(386, "Serve currents"),
      }),
      // A separate run, an hour earlier.
      release({
        tag_name: "@slackwater/cli@0.9.0",
        published_at: "2026-10-10T18:20:00Z",
        body: changeset(384, "Fix the binaries"),
      }),
    ],
  );
  assert.deepEqual(
    out.map((r) => [r.id, r.title, r.packages.length]),
    [
      ["slackwater-1-0-0", "Slackwater 1.0.0", 3],
      ["slackwater-cli-0-9-0", "@slackwater/cli 0.9.0", 0],
    ],
  );
  assert.equal(
    out[0].body,
    "- Add currents ([#347](https://x/pull/347))\n- Serve currents ([#386](https://x/pull/386))",
  );
});

test("summarize: first paragraph as plain text, joined across hard wraps", () => {
  assert.equal(
    summarize(
      "## Heading\n\nChores:\n- Drop the `CJS`\n  builds ([#301](https://x))\n- Next",
    ),
    "Drop the CJS builds",
  );
});

test("cleanBody: an image without alt text gets one", () => {
  assert.equal(
    cleanBody("![](https://x/a.png)"),
    "![Screenshot](https://x/a.png)",
  );
});

test("isPatch: semver patches only, not date versions", () => {
  assert.deepEqual(
    ["0.6.2", "0.6.0", "1.0.0", "2026.08.17", "0.9.20260923", "1.2"].map(
      isPatch,
    ),
    [true, false, false, false, false, false],
  );
});

test("changelogPath and filterTitle: project, type, or both", () => {
  const filters = [
    {},
    { project: "ais" },
    { type: "announcements" },
    { project: "ais", type: "releases" },
  ] as const;
  assert.deepEqual(
    filters.map((f) => [changelogPath(f), filterTitle(f)]),
    [
      ["/changelog/", "Changelog"],
      ["/changelog/ais/", "AIS changelog"],
      ["/changelog/announcements/", "Announcements"],
      ["/changelog/ais/releases/", "AIS releases"],
    ],
  );
});

test("toReleases: runs without an umbrella get unique ids, and a package's second version starts a new run", () => {
  const at = (tag: string, published_at: string) =>
    release({ tag_name: tag, published_at, body: `- ${tag}` });
  const out = toReleases(
    { repo: "slackwater", project: "tides", name: "Neaps", grouped: true },
    [
      at("@slackwater/engine@1.0.2", "2026-10-07T22:44:00Z"),
      at("@slackwater/engine@1.0.1", "2026-10-07T22:40:00Z"),
      at("@slackwater/api@1.0.1", "2026-10-07T17:05:00Z"),
      at("@slackwater/engine@1.0.0", "2026-10-07T17:04:00Z"),
    ],
  );
  assert.deepEqual(
    out.map((r) => [r.id, r.packages.length]),
    [
      ["slackwater-engine-1-0-2", 0],
      ["slackwater-engine-1-0-1", 0],
      ["slackwater-api-1-0-1", 2],
    ],
  );
});

test("toReleases: untagged releases in a grouped repo stand alone, and same-PR changes both survive", () => {
  const grouped: Source = {
    repo: "slackwater",
    project: "tides",
    name: "Neaps tide predictor",
    grouped: true,
  };
  const pr = (text: string) =>
    `- [#347](https://x/pull/347) [\`abc1234\`](https://x/c) Thanks [@b](https://x/b)! - ${text}`;
  const out = toReleases(grouped, [
    release({ tag_name: "neaps@0.1.0", published_at: "2025-12-21T23:47:00Z" }),
    release({
      tag_name: "@slackwater/engine@1.0.0",
      published_at: "2026-10-10T19:51:37Z",
      body: pr("Add currents"),
    }),
    release({
      tag_name: "@slackwater/api@1.0.0",
      published_at: "2026-10-10T19:51:43Z",
      body: pr("Serve currents"),
    }),
    release({
      tag_name: "v0.1.1",
      name: "@neaps/tide-predictor@0.1.1",
      published_at: "2022-07-16T17:49:00Z",
    }),
    release({ tag_name: "v0.1.0", published_at: "2022-07-16T17:35:00Z" }),
  ]);
  assert.deepEqual(
    out.map((r) => r.id),
    [
      "slackwater-api-1-0-0",
      "neaps-0-1-0",
      "neaps-tide-predictor-0-1-1",
      "neaps-tide-predictor-0-1-0",
    ],
  );
  assert.equal(out[0].body.split("\n").length, 2);
});

test("cleanBody: code blocks pass through untouched", () => {
  const body = "```sh\n# install\n* not a bullet\n```";
  assert.equal(cleanBody(body), body);
});

test("headline: a release name that says more than the version", () => {
  const cases: [string | null, string, string, string[], string | undefined][] =
    [
      ["Uranus and Neptune", "v0.8.0", "", ["Almanac"], "Uranus and Neptune"],
      ["v0.5.0 — the bundle ships", "v0.5.0", "", [], "The bundle ships"],
      ["Currents", "v1.0.0", "", ["Slackwater"], "Currents"],
      ["v1.2.0 — bugfixes", "v1.2.0", "", ["Almanac"], "Bugfixes"],
      ["Almanac 0.8.0: Uranus", "v0.8.0", "", ["Almanac"], "Uranus"],
      ["Release v1.2.0", "v1.2.0", "", ["Almanac"], undefined],
      ["v0.8.0", "v0.8.0", "", ["Almanac"], undefined],
      ["Seascape v0.3.0", "v0.3.0", "v", ["Seascape"], undefined],
      ["Style v0.4.0", "style-v0.4.0", "style-", ["Seascape style"], undefined],
      [
        "Signal K tides plugin 2.2.0",
        "v2.2.0",
        "",
        ["Signal K tides plugin"],
        undefined,
      ],
      [
        "signalk-aiscast 0.6.3",
        "signalk-plugin-v0.6.3",
        "signalk-plugin-",
        ["Signal K AIS plugin"],
        undefined,
      ],
      ["1.13.0 (38)", "v1.13.0", "", ["Slackwater for iOS"], undefined],
      [
        "neaps@0.8.0",
        "neaps@0.8.0",
        "",
        ["Neaps", "neaps", "0.8.0"],
        undefined,
      ],
      [null, "v1.0.0", "", [], undefined],
    ];
  for (const [name, tag, prefix, names, expected] of cases)
    assert.equal(headline(name, tag, prefix, names), expected, String(name));
});

test("toReleases: a beta version is skipped even when GitHub doesn't flag it", () => {
  const out = toReleases(source, [
    release({ tag_name: "v1.0.0-beta.3" }),
    release({ tag_name: "v0.9.0" }),
  ]);
  assert.deepEqual(
    out.map((r) => r.title),
    ["Almanac 0.9.0"],
  );
});

test("cleanBody: GitHub's HTML screenshots become images, and a PR link stays out of code fences", () => {
  assert.equal(
    cleanBody(
      '<img width="800" alt="Image" src="https://github.com/user-attachments/assets/a">',
    ),
    "![Screenshot](https://github.com/user-attachments/assets/a)",
  );
  const body = [
    "- [#12](https://x/pull/12) [`abc1234`](https://x/c) Thanks [@b](https://x/b)! - Add a flag",
    "  ```sh",
    "  tool --flag",
    "  ```",
  ].join("\n");
  assert.equal(
    cleanBody(body),
    [
      "- Add a flag ([#12](https://x/pull/12))",
      "  ```sh",
      "  tool --flag",
      "  ```",
    ].join("\n"),
  );
});

test("toReleases: a hyphen outside a semver prerelease doesn't hide a release", () => {
  assert.deepEqual(
    toReleases(source, [
      release({ tag_name: "v2026-08-17" }),
      release({ tag_name: "v1.2.3-rc.1" }),
    ]).map((r) => r.title),
    ["Almanac 2026-08-17"],
  );
});

test("cleanBody leaves images in code blocks alone, and summarize skips a screenshot line", () => {
  const fenced = '```md\n![](x.png)\n<img src="https://x/a.png">\n```';
  assert.equal(cleanBody(fenced), fenced);
  assert.equal(
    summarize(cleanBody('<img src="https://x/a.png">\n\nAdds a tide widget')),
    "Adds a tide widget",
  );
});

test("localizeImages: local copies replace remote images; the rest become links", async () => {
  const html =
    '<p><img src="https://github.com/a.png" alt="Map"></p>' +
    '<p><img src="https://tracker.example/p.gif" alt=""></p>' +
    '<p><img src="/_astro/b.webp" alt="Local"></p>';
  const out = await localizeImages(html, async (src) =>
    src.startsWith("https://github.com/") ? "/_astro/a.webp" : src,
  );
  assert.equal(
    out,
    '<p><img src="/_astro/a.webp" alt="Map"></p>' +
      '<p><a href="https://tracker.example/p.gif">Image</a></p>' +
      '<p><img src="/_astro/b.webp" alt="Local"></p>',
  );
  // `$` in release-note text stays literal.
  assert.equal(
    await localizeImages(
      '<img src="https://github.com/a.png" alt="costs $\' more">',
      async () => "/_astro/a.webp",
    ),
    '<img src="/_astro/a.webp" alt="costs $\' more">',
  );
  // A failed download links to the original.
  assert.equal(
    await localizeImages('<img src="https://github.com/a.png" alt="Map">', () =>
      Promise.reject(new Error("offline")),
    ),
    '<a href="https://github.com/a.png">Map</a>',
  );
});
