# AGENTS.md

Guidelines for AI coding assistants working on the Open Waters project.

## Project Overview

Open Waters is an open-source marine software platform providing tools and data for understanding and navigating the sea. This is a monorepo containing:

- **website/** - Astro static site with React components
- **api/** - Express.js API for marine data services

## Technology Stack

| Component | Technology |
|-----------|------------|
| Website Framework | Astro 7.x |
| UI Library | React 19.x |
| Styling | Tailwind CSS 4.x (CSS-based config in `global.css`) |
| Language | TypeScript 5.x |
| Maps | MapLibre GL |
| Tide Engine | Neaps |
| API Framework | Express.js |
| Formatting | Prettier |
| Pre-commit | Husky + lint-staged |

## Project Structure

```
├── website/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # Header, Footer (Astro)
│   │   │   ├── ui/          # Card, Container (Astro)
│   │   │   └── tides/       # TideCharts (React)
│   │   ├── layouts/         # MainLayout
│   │   ├── pages/           # File-based routing
│   │   ├── styles/          # global.css
│   │   └── utils/           # cn() utility
│   ├── public/              # Static assets
│   └── astro.config.mjs
├── api/
│   ├── src/app.ts           # Express app
│   ├── src/worker.ts        # Worker entry
│   └── wrangler.jsonc
├── gateway/                 # api.openwaters.io dispatcher
└── package.json             # Monorepo workspaces
```

## Commands

```bash
# Development
npm run dev              # Run website and API concurrently
npm run dev:website      # Astro dev server (port 4321)
npm run dev:api          # Express API (port 3001)

# Build
npm run build            # Build website with type checking

# Formatting
npm run format           # Run prettier (in website/)
```

## Code Conventions

### Astro Components

- Use `.astro` extension for static/layout components
- Frontmatter (`---`) contains server-side logic
- Props are destructured from `Astro.props`
- Use `<slot />` for component children

```astro
---
import { cn } from "../utils/cn";
interface Props {
  class?: string;
}
const { class: className } = Astro.props;
---
<div class={cn("base-class", className)}>
  <slot />
</div>
```

### React Components

- Use `.tsx` extension for interactive components
- Functional components with TypeScript
- Use `className` (not `class`) for CSS
- Import in Astro with `client:*` directive for hydration

```tsx
interface Props {
  title: string;
}

export function MyComponent({ title }: Props) {
  return <div className="text-navy-900">{title}</div>;
}
```

### Styling

- **Always use Tailwind classes** - avoid inline styles
- **Use the `cn()` utility** for conditional/merged classes
- **Custom color palette**:
  - `ocean-*` - Primary blues (0-950)
  - `navy-*` - Dark text/backgrounds (0-950)
  - `coral-*` - Accent reds (0-900)
- **Component classes** defined in `global.css`:
  - `.btn-primary`, `.btn-secondary`, `.btn-outline`
  - `.card`, `.card-hover`
  - `.container-custom`

### Page Structure

All pages should follow this pattern:

```astro
---
import MainLayout from "../layouts/MainLayout.astro";
import Container from "../components/ui/Container.astro";
import Card from "../components/ui/Card.astro";
---

<MainLayout title="Page Title" description="Page description for SEO">
  <Container>
    <h1>Page Heading</h1>
    <Card>
      <!-- Content -->
    </Card>
  </Container>
</MainLayout>
```

### File-Based Routing

Pages in `src/pages/` map directly to URLs:
- `src/pages/index.astro` → `/`
- `src/pages/about.astro` → `/about`
- `src/pages/tides/harmonics.astro` → `/tides/harmonics`

## Important Patterns

### CSS Class Merging

Always use the `cn()` utility when combining classes:

```typescript
import { cn } from "../utils/cn";

// Merges classes and handles conflicts
cn("p-4 bg-ocean-500", hover && "bg-ocean-600", className)
```

### Avoid Stack Overflow on Large Arrays

When working with chart data or large arrays, avoid spread operators:

```typescript
// BAD - can cause stack overflow
const min = Math.min(...largeArray);

// GOOD - use loop instead
let min = Infinity;
for (const val of largeArray) {
  if (val < min) min = val;
}
```

### React in Astro

Use client directives when adding React components to Astro pages:

```astro
---
import { TideChart } from "../components/tides/TideCharts";
---
<TideChart client:load data={chartData} />
```

## Environment Variables

Public variables (accessible client-side) use `PUBLIC_` prefix:
- `PUBLIC_TIDES_API_URL`
- `PUBLIC_BATHYMETRY_API_URL`
- `PUBLIC_SITE_URL`
- `PUBLIC_GITHUB_ORG`
- `PUBLIC_CONTACT_EMAIL`

## Pre-commit Hooks

Prettier runs automatically on staged files before commit. To format manually:

```bash
cd website && npm run format
```

## Common Tasks

### Adding a New Page

1. Create `.astro` file in `src/pages/`
2. Import and use `MainLayout` with title/description
3. Wrap content in `Container`
4. Use semantic HTML and custom color classes
5. Format with `npm run format`

### Adding Interactive Components

1. Create `.tsx` file in `src/components/`
2. Use TypeScript interfaces for props
3. Style with Tailwind classes
4. Import in Astro page with `client:*` directive

### Updating Navigation

1. Edit `navItems` in `src/components/layout/Header.astro`
2. Update footer links in `src/components/layout/Footer.astro`

### Modifying Global Styles

1. Edit `src/styles/global.css` for base/component styles
2. Edit the `@theme` block in `src/styles/global.css` for theme customization

## Type Checking

Type checking runs as part of the build:

```bash
npm run build  # Runs astro check && astro build
```

Prefer implicit types. Avoid use of `any` type; Don't define a new type unless an existing one won't do;

## Deployment

Three Cloudflare Workers, each with its own `wrangler.jsonc` and Workers Builds
config (deploys on push to `main`, preview URLs on PRs):

- `website/` → `openwaters-io` — the Astro site (`openwaters.io`, `www`).
- `api/` → `openwaters-api` — the tides API.
- `gateway/` → `openwaters-api-gateway` — owns `api.openwaters.io` and
  dispatches `/tides*` and `/bathymetry*` to the API workers over service
  bindings.

See `CLOUDFLARE_MIGRATION.md` for the architecture and its rationale.
