# openwaters.io website + API

This repository contains the source code for the [openwaters.io](https://openwaters.io) website and its accompanying API. The project is built using [Astro](https://astro.build/) for the frontend and [Express](https://expressjs.com/) for the backend API, all managed within a monorepo structure.

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
