# openwaters.io

Open source marine software and data platform.

## About

Open Waters provides open source tools and data for understanding and navigating the sea, including:

- **Tide Predictions**: Accurate predictions powered by the Neaps engine
- **Crowd Depth**: Crowd-sourced bathymetry data collection
- **Developer APIs**: Programmatic access to marine data

## Tech Stack

- **Astro** - Fast, modern static site generator
- **React** - Interactive components
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type-safe development

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/openwatersio/openwaters.io.git
cd openwaters.io

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The site will be available at `http://localhost:4321`

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run astro check
```

## Project Structure

```
openwaters-io/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── layout/      # Header, Footer, etc.
│   │   ├── ui/          # UI components
│   │   └── react/       # React components
│   ├── layouts/         # Page layouts
│   ├── pages/           # Route pages
│   ├── styles/          # Global styles
│   └── utils/           # Utility functions
├── astro.config.mjs     # Astro configuration
├── tailwind.config.mjs  # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

## Pages

- `/` - Homepage
- `/about` - About Open Waters
- `/tides` - Tide predictions overview
  - `/tides/stations` - Interactive station map
  - `/tides/database` - Tide database info
  - `/tides/neaps` - About the Neaps engine
- `/bathymetry` - Crowd Depth project
- `/api` - API documentation
- `/license` - License information

## Contributing

We welcome contributions! Please see our contributing guidelines for more information.

## License

MIT License - see LICENSE file for details

## Links

- **Website**: https://openwaters.io
- **GitHub**: https://github.com/openwatersio
- **Email**: hello@openwaters.io

## Acknowledgments

- NOAA for tide data
- IHO for the TICON database
- The open source community
