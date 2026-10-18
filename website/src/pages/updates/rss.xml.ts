import type { APIRoute } from "astro";

import { changelogFeed } from "../../utils/changelog-feed";

export const GET: APIRoute = ({ site }) => changelogFeed(site!);
