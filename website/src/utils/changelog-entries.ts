import { getCollection, type CollectionEntry } from "astro:content";

import {
  PROJECT_KEYS,
  TYPE_KEYS,
  TYPES,
  type Filter,
  type Project,
} from "./changelog";

export type Entry =
  | {
      type: "release";
      id: string;
      date: Date;
      title: string;
      /** Package and version, when the title is a headline. */
      subtitle?: string;
      summary: string;
      projects: Project[];
      release: CollectionEntry<"releases">;
    }
  | {
      type: "announcement";
      id: string;
      date: Date;
      title: string;
      summary: string;
      projects: Project[];
      announcement: CollectionEntry<"announcements">;
    };

/** Releases and announcements, newest first, optionally narrowed by a filter. */
export async function getEntries({ project, type }: Filter = {}): Promise<
  Entry[]
> {
  const [releases, announcements] = await Promise.all([
    getCollection("releases"),
    // Drafts and future-dated announcements show only in dev.
    getCollection(
      "announcements",
      (a) =>
        import.meta.env.DEV || (!a.data.draft && +a.data.date <= Date.now()),
    ),
  ]);
  const entries: Entry[] = [
    ...releases.map((release) => ({
      type: "release" as const,
      id: release.id,
      date: release.data.date,
      title: release.data.headline ?? release.data.title,
      subtitle: release.data.headline && release.data.title,
      summary: release.data.summary,
      projects: [release.data.project as Project],
      release,
    })),
    ...announcements.map((announcement) => ({
      type: "announcement" as const,
      id: announcement.id,
      date: announcement.data.date,
      title: announcement.data.title,
      summary: announcement.data.summary,
      projects: announcement.data.projects as Project[],
      announcement,
    })),
  ];
  // Entries share /changelog/<id>/ with the filter pages, and a collision would
  // silently drop a page.
  const taken = new Set<string>([...PROJECT_KEYS, ...TYPE_KEYS]);
  for (const { id } of entries) {
    if (taken.has(id))
      throw new Error(`changelog: duplicate or reserved id ${id}`);
    taken.add(id);
  }

  return entries
    .filter((e) => !type || e.type === TYPES[type].type)
    .filter(
      (e) =>
        !project ||
        e.projects.includes(project) ||
        // An announcement for all of Open Waters belongs on every project's page.
        (e.type === "announcement" && !e.projects.length),
    )
    .sort((a, b) => +b.date - +a.date);
}

export const entryHref = (entry: Pick<Entry, "id">) =>
  `/changelog/${entry.id}/`;

export const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString("en-US", { timeZone: "UTC", ...options });
