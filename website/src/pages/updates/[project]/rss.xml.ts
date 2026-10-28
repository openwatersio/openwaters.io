import type { APIRoute, GetStaticPaths } from "astro";

import {
  PROJECT_KEYS,
  TYPE_KEYS,
  type Project,
  type TypeKey,
} from "../../../utils/changelog";
import { changelogFeed } from "../../../utils/changelog-feed";

// One segment is either a project (/updates/ais/rss.xml) or a type
// (/updates/announcements/rss.xml).
export const getStaticPaths = (() =>
  [...PROJECT_KEYS, ...TYPE_KEYS].map((project) => ({
    params: { project },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, params }) => {
  const key = params.project!;
  return changelogFeed(
    site!,
    (TYPE_KEYS as string[]).includes(key)
      ? { type: key as TypeKey }
      : { project: key as Project },
  );
};
