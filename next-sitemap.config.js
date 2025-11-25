/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://prochazkagroup.cz',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/private-page', '/admin/*', '/api/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/private-page', '/admin', '/api'],
      },
    ],
  },
  transform: async (config, path) => {
    // Custom priority for important pages
    const customPriority = {
      '/': 1.0,
      '/kontakt': 0.9,
      '/recenze': 0.9,
      '/o-nas': 0.8,
      '/benefit-program': 0.8,
      '/nabidky': 0.8,
    };

    // Check for specific priorities first
    let priority = customPriority[path];

    // If not found, check patterns
    if (!priority) {
      if (path.startsWith('/reviews/')) {
        priority = 0.6; // All individual review submission pages
      } else {
        priority = config.priority; // Default fallback (0.7)
      }
    }

    return {
      loc: path,
      changefreq: config.changefreq,
      priority: priority,
      lastmod: new Date().toISOString(),
    };
  },
};