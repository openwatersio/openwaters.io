# openwaters.io

The source for [openwaters.io](https://openwaters.io), including the Astro website, tides API, and API gateway. All three run on Cloudflare Workers.

## Development

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

The website runs on `http://localhost:4321` and the tides API runs on `http://localhost:3001`. Use `npm run dev:website` or `npm run dev:api` to run one service.

Run the local checks with:

```sh
npm run build
npm test -w website
npm run build -w api
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repository layout, conventions, and deployment details.

## Deployment

Cloudflare Workers Builds creates pull request previews and deploys merges to `main`. This website does not use versioned releases.
