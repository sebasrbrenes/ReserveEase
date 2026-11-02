import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Public pages listed in the sitemap.
const PAGES = ['/', '/about', '/terms', '/terms/en', '/privacy-policy', '/privacy-policy/en', '/refunds', '/refunds/en']

// Fills in the site's absolute URL, which share previews (Open Graph) need, and writes robots.txt and
// sitemap.xml for it. Set VITE_SITE_URL to the landing's public URL (for example, a custom domain).
const siteFiles = (siteUrl) => ({
  name: 'site-files',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'robots.txt',
      source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    })
    const urls = PAGES.map((page) => `  <url><loc>${siteUrl}${page === '/' ? '/' : page}</loc></url>`).join('\n')
    this.emitFile({
      type: 'asset',
      fileName: 'sitemap.xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.')
  const siteUrl = (env.VITE_SITE_URL || 'https://reserve-ease-nwpq.vercel.app').replace(/\/+$/, '')
  return {
    plugins: [react(), siteFiles(siteUrl)],
  }
})
