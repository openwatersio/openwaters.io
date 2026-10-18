import type { APIRoute, GetStaticPaths } from "astro";

import {
  PROJECT_KEYS,
  TYPE_KEYS,
  type Project,
  type TypeKey,
} from "../../../../utils/changelog";
import { changelogFeed } from "../../../../utils/changelog-feed";

export const getStaticPaths = (() =>
  PROJECT_KEYS.flatMap((project) =>
    TYPE_KEYS.map((type) => ({ params: { project, type } })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, params }) =>
  changelogFeed(site!, {
    project: params.project as Project,
    type: params.type as TypeKey,
  });
