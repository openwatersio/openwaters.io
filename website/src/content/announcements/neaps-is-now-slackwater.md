---
title: Neaps is now Slackwater
date: 2026-10-11
summary: The tide engine, its database, and the Slackwater app now share one name. The packages move to the @slackwater scope, and 1.0 is close.
projects: [tides]
draft: true
---

_Draft for design review. The real announcement will replace this text._

Neaps, the open source tide prediction engine behind Slackwater and openwaters.io/tides, is now called Slackwater. Slackwater is the name for everything we do with tides: the engine, the station database, the API, and the iOS app.

## What changes

| Neaps                                      | Slackwater                                                |
| ------------------------------------------ | --------------------------------------------------------- |
| `neaps`                                    | `slackwater`                                              |
| `@neaps/tide-predictor`                    | `@slackwater/engine`                                      |
| `@neaps/tide-database`                     | `@slackwater/database`                                    |
| `@neaps/cli`, `@neaps/api`, `@neaps/react` | `@slackwater/cli`, `@slackwater/api`, `@slackwater/react` |

The CLI command is `slackwater`, and the Swift library is `SlackwaterKit`.

## Upgrading

The 1.0 betas are on npm now. Besides the names, `@slackwater/engine` drops its deprecated default export, and `@slackwater/react` renames `NeapsProvider` to `SlackwaterProvider`. The [release notes](https://github.com/openwatersio/slackwater/releases) list every change.
