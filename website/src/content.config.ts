import { defineCollection } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import { z } from "astro/zod";

import {
  PROJECT_KEYS,
  SOURCES,
  toReleases,
  type GitHubRelease,
} from "./utils/changelog";

const project = z.enum(PROJECT_KEYS as [string, ...string[]]);

async function fetchReleases(repo: string): Promise<GitHubRelease[]> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "openwaters.io changelog",
  };
  // Optional, but the build machines share IPs and GitHub allows 60 anonymous
  // requests an hour per IP.
  if (process.env.GITHUB_TOKEN)
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const releases: GitHubRelease[] = [];
  let url: string | undefined =
    `https://api.github.com/repos/openwatersio/${repo}/releases?per_page=100`;
  while (url) {
    const get = () =>
      fetch(url!, { headers, signal: AbortSignal.timeout(30_000) });
    // ponytail: one retry for GitHub's occasional 5xx; an outage still fails.
    let res: Response = await get().catch(get);
    if (res.status >= 500) res = await get();
    // Failing the build beats deploying a changelog with a project missing.
    if (!res.ok)
      throw new Error(
        `changelog: ${repo} releases: HTTP ${res.status}` +
          (res.status === 401
            ? " (GITHUB_TOKEN is invalid or expired)"
            : [403, 429].includes(res.status) && !process.env.GITHUB_TOKEN
              ? " (GitHub's anonymous rate limit; set GITHUB_TOKEN)"
              : res.status === 404
                ? " (renamed, private, or deleted; update SOURCES)"
                : ""),
      );
    releases.push(...((await res.json()) as GitHubRelease[]));
    url = /<([^>]+)>; rel="next"/.exec(res.headers.get("link") ?? "")?.[1];
  }
  return releases;
}

const githubReleases: Loader = {
  name: "github-releases",
  load: async ({ store, parseData, logger }) => {
    const repos = [...new Set(SOURCES.map((s) => s.repo))];
    const fetched = new Map(
      await Promise.all(
        repos.map(async (repo) => [repo, await fetchReleases(repo)] as const),
      ),
    );
    store.clear();
    for (const source of SOURCES) {
      const releases = toReleases(source, fetched.get(source.repo)!);
      // A tag scheme change can filter out a whole source without an error.
      if (!releases.length && fetched.get(source.repo)!.length)
        logger.warn(
          `${source.name}: ${source.repo} has releases, but none are shown`,
        );
      for (const release of releases) {
        // Upstream tags can repeat a title; a date keeps both pages.
        let id = release.id;
        if (store.has(id)) {
          id = `${id}-${release.date.toISOString().slice(0, 10)}`;
          logger.warn(
            `${release.repo}: duplicate id ${release.id}, using ${id}`,
          );
        }
        store.set({
          id,
          data: await parseData({ id, data: { ...release } }),
        });
      }
    }
    logger.info(
      `loaded ${store.keys().length} releases` +
        (process.env.GITHUB_TOKEN ? " with GITHUB_TOKEN" : " anonymously"),
    );
  },
};

const releases = defineCollection({
  loader: githubReleases,
  schema: z.object({
    project,
    repo: z.string(),
    title: z.string(),
    headline: z.string().optional(),
    date: z.coerce.date(),
    body: z.string(),
    summary: z.string(),
    url: z.url(),
    patch: z.boolean(),
    packages: z.array(
      z.object({ name: z.string(), version: z.string(), url: z.url() }),
    ),
  }),
});

const announcements = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/announcements" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      summary: z.string(),
      /** Empty means all of Open Waters. */
      projects: z.array(project).default([]),
      image: image().optional(),
      /** Shown in dev, left out of builds. */
      draft: z.boolean().default(false),
    }),
});

export const collections = { releases, announcements };
