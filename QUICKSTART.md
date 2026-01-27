# Quick Start Guide - openwaters.io

Get the Open Waters website running in 5 minutes!

## 🚀 Quick Setup

```bash
# 1. Clone or download the project
cd openwaters-io

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open http://localhost:4321 in your browser. That's it!

## 📝 What You Get

A fully functional website with:

✅ Homepage with hero, features, and CTAs  
✅ About page with mission and team info  
✅ Tides section (overview, stations, database, Neaps engine)  
✅ Bathymetry/Crowd Depth page  
✅ API documentation  
✅ License information  
✅ Responsive navigation and footer  
✅ Mobile-friendly design  
✅ Accessibility (WCAG 2.1 AA)  
✅ SEO optimized  
✅ Nautical theme with ocean blues

## 🎨 Customization

### Colors

Edit `tailwind.config.mjs` to change the color scheme:

```javascript
colors: {
  ocean: { /* Primary blue shades */ },
  navy: { /* Dark text/background */ },
  coral: { /* Accent color */ }
}
```

### Content

All pages are in `src/pages/`:

- `index.astro` - Homepage
- `about.astro` - About page
- `tides/` - Tide-related pages
- `bathymetry/` - Bathymetry info
- `api.astro` - API docs
- `license.astro` - License page

### Components

Reusable components in `src/components/`:

- `layout/` - Header, Footer
- `ui/` - Card, Container, etc.
- `react/` - Interactive React components (to be added)

## 🔧 Common Tasks

### Add a New Page

```bash
# Create new page file
touch src/pages/your-page.astro
```

```astro
---
import MainLayout from "../layouts/MainLayout.astro";
import Container from "../components/ui/Container.astro";
---

<MainLayout title="Your Page">
  <Container class="py-16">
    <h1>Your Page Title</h1>
    <p>Your content here...</p>
  </Container>
</MainLayout>
```

### Add to Navigation

Edit `src/components/layout/Header.astro`:

```javascript
const navItems = [
  // ... existing items
  { name: "Your Page", href: "/your-page" },
];
```

### Change Site Info

Edit `src/layouts/MainLayout.astro` for default SEO/meta tags.

Edit `src/components/layout/Footer.astro` for footer links and info.

## 🌊 Next Steps

### Phase 2 - Interactive Features (Coming Soon)

The foundation is ready! Next up:

1. **Interactive Station Map** - MapLibre-based map component
2. **Tide Charts** - React components for visualization
3. **Station Detail Pages** - Dynamic routes for each station
4. **Search Functionality** - Search stations by name/location
5. **API Integration** - Connect to live tide data

### Build for Production

```bash
npm run build
# Output in dist/
```

### Deploy

See `DEPLOYMENT.md` for detailed deployment instructions.

Quick deploy to Netlify:

1. Push to GitHub
2. Connect repo on Netlify
3. Done! Auto-deploys on push

## 📚 Resources

- **Astro Docs**: https://docs.astro.build
- **Tailwind Docs**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev
- **Open Waters**: https://github.com/openwatersio

## 🐛 Troubleshooting

**Port already in use?**

```bash
npm run dev -- --port 3000
```

**Build errors?**

```bash
# Clear cache and rebuild
rm -rf dist .astro node_modules
npm install
npm run build
```

**Tailwind not working?**

- Check `global.css` is imported in layout
- Verify `content` paths in `tailwind.config.mjs`

## 💬 Get Help

- GitHub Issues: https://github.com/openwatersio/openwaters.io
- Email: info@openwaters.io

---

Happy coding! 🌊
