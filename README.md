# Open Waters Monorepo

This repository contains both the Open Waters website and API.

## Structure

```
.
├── website/          # Astro static site (openwaters.io)
├── api/              # Express API as Vercel serverless function (api.openwaters.io)
├── vercel.json       # Vercel deployment configuration
└── package.json      # Monorepo root with workspaces
```

## Development

### Start both website and API:
```bash
npm run dev
```

This runs:
- **Website** at http://localhost:4321
- **API** at http://localhost:3001

### Start individually:
```bash
npm run dev:website   # Astro site only
npm run dev:api       # API only
```

## Deployment to Vercel

### One-time setup:
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`

### Deploy:
```bash
vercel              # Preview deployment
vercel --prod       # Production deployment
```

### Configure domains in Vercel Dashboard:
- Set `openwaters.io` as primary domain (website)
- Add `api.openwaters.io` as additional domain (API routes)

The `vercel.json` configuration automatically routes `/api/*` requests to the Express API serverless function.

## API Routes

- `https://api.openwaters.io/tides/*` - Tide predictions (powered by @neaps/api)
- `https://api.openwaters.io/bathymetry/*` - Crowd-sourced depth data (coming soon)
- `https://api.openwaters.io/health` - Health check

## Environment Variables

Copy `website/.env.example` to configure local development (not needed for production—Vercel uses its own env config).
