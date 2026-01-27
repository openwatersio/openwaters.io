# Deployment Guide for openwaters.io

This guide covers deploying the Open Waters website to various hosting platforms.

## Prerequisites

Before deploying, ensure:
- All environment variables are configured
- The site builds successfully locally (`npm run build`)
- All tests pass (if applicable)

## Recommended Platforms

### Option 1: Netlify (Recommended)

Netlify offers excellent Astro support with automatic deployments.

#### Setup Steps:

1. **Connect Repository**
   - Sign up at https://netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18 or higher

3. **Environment Variables**
   - Go to Site settings → Environment variables
   - Add your environment variables:
     ```
     PUBLIC_TIDES_API_URL=https://api.openwaters.io/tides
     PUBLIC_BATHYMETRY_API_URL=https://api.openwaters.io/bathymetry
     PUBLIC_SITE_URL=https://openwaters.io
     PUBLIC_GITHUB_ORG=https://github.com/openwatersio
     PUBLIC_CONTACT_EMAIL=info@openwaters.io
     ```

4. **Custom Domain**
   - Go to Domain settings
   - Add custom domain: openwaters.io
   - Configure DNS settings as instructed by Netlify
   - SSL certificate will be auto-provisioned

5. **Deploy**
   - Netlify will automatically deploy on every push to main branch
   - Manual deploys: Click "Deploy site" in Netlify dashboard

#### Netlify Configuration File

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/404.html"
  status = 404

[build.environment]
  NODE_VERSION = "18"
```

### Option 2: Vercel

Vercel also has excellent Astro support.

#### Setup Steps:

1. **Connect Repository**
   - Sign up at https://vercel.com
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**
   - Framework Preset: Astro
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Environment Variables**
   - Add environment variables in project settings

4. **Deploy**
   - Automatic deployment on push to main
   - Custom domain configuration in project settings

### Option 3: Cloudflare Pages

#### Setup Steps:

1. **Connect Repository**
   - Sign up at https://pages.cloudflare.com
   - Create a new project
   - Connect GitHub repository

2. **Build Configuration**
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`

3. **Environment Variables**
   - Add in Pages project settings

4. **Custom Domain**
   - Configure in Pages settings
   - DNS managed by Cloudflare

## Manual Deployment

For self-hosting or other platforms:

### Build the Site

```bash
# Build for production
npm run build

# Output will be in dist/ directory
```

### Static Hosting

The `dist/` folder contains static files that can be hosted on:
- Apache
- Nginx  
- AWS S3 + CloudFront
- Google Cloud Storage
- Any static file server

### Example: Nginx Configuration

```nginx
server {
    listen 80;
    server_name openwaters.io www.openwaters.io;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name openwaters.io www.openwaters.io;
    
    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/openwaters.io/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /404.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build site
        run: npm run build
        env:
          PUBLIC_TIDES_API_URL: ${{ secrets.PUBLIC_TIDES_API_URL }}
          PUBLIC_BATHYMETRY_API_URL: ${{ secrets.PUBLIC_BATHYMETRY_API_URL }}
          PUBLIC_SITE_URL: ${{ secrets.PUBLIC_SITE_URL }}
          PUBLIC_GITHUB_ORG: ${{ secrets.PUBLIC_GITHUB_ORG }}
          PUBLIC_CONTACT_EMAIL: ${{ secrets.PUBLIC_CONTACT_EMAIL }}
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

## DNS Configuration

### For openwaters.io:

**A Records:**
```
@ → [Your hosting IP]
www → [Your hosting IP]
```

**CNAME Records (if using Netlify/Vercel):**
```
www → [your-site].netlify.app
@ → [your-site].netlify.app (via ALIAS/ANAME)
```

**API Subdomain:**
```
api → [Your API server IP/domain]
```

## Performance Optimization

### Pre-deployment Checklist:

- [ ] Images optimized (WebP, compressed)
- [ ] Fonts subset and optimized
- [ ] CSS purged of unused styles (Tailwind handles this)
- [ ] JavaScript minified
- [ ] Enable compression (gzip/brotli)
- [ ] Configure caching headers
- [ ] Enable HTTP/2
- [ ] Set up CDN (if needed)

### Lighthouse Scores to Aim For:

- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

## Monitoring

### Recommended Tools:

1. **Uptime Monitoring**
   - UptimeRobot
   - Pingdom
   - StatusCake

2. **Analytics**
   - Plausible (privacy-friendly)
   - Google Analytics
   - Fathom

3. **Error Tracking**
   - Sentry
   - Rollbar

4. **Performance**
   - Web Vitals
   - PageSpeed Insights
   - WebPageTest

## Rollback Plan

If issues occur after deployment:

### On Netlify/Vercel:
- Use the platform's rollback feature
- Or redeploy a previous commit

### Manual Hosting:
- Keep previous build in `dist.backup/`
- Swap directories if needed
- Keep git tags for releases

## Security

### SSL/TLS:
- Use Let's Encrypt for free certificates
- Enable HTTPS-only mode
- Configure HSTS headers

### Security Headers:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;" always;
```

## Post-Deployment

1. **Test all pages** - Navigate through the entire site
2. **Check mobile responsiveness** - Test on various devices
3. **Verify links** - Ensure all internal/external links work
4. **Test forms** - If any (contact forms, etc.)
5. **Check SEO** - Verify meta tags, sitemap, robots.txt
6. **Monitor logs** - Check for any errors
7. **Performance test** - Run Lighthouse audit

## Support

For deployment issues:
- Check Astro documentation: https://docs.astro.build/en/guides/deploy/
- Open Waters GitHub: https://github.com/openwatersio
- Email: info@openwaters.io

---

**Last Updated:** January 2025
