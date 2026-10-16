/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://prochazkagroup.cz',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  // The Studio and its preview frames are the CMS's own surface — they are
  // for whoever edits this site, never for a search engine, and they were
  // being published in the sitemap.
  // /recenze/<poradce> are the forms a client is sent to write a review; they
  // carry noindex, so listing them here only told Google two opposite things.
  exclude: ['/private-page', '/admin/*', '/api/*', '/studio', '/studio/*', '/recenze/*'],
  robotsTxtOptions: {
    policies: [
      // One group: two `User-agent: *` groups are merged by Google but not by
      // every crawler, and some read only the first one they meet.
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/private-page', '/admin', '/api', '/studio'],
      },
    ],
  },
  transform: async (config, path) => {
    // Custom priority for important pages
    const customPriority = {
      '/': 1.0,
      // '/kontakt' takes the default: it is the fallback address of the
      // contact sheet the bar opens, and on arrival it opens that sheet.
      '/recenze': 0.9,
      '/o-nas': 0.8,
      '/benefit-program': 0.8,
      '/nabidky': 0.8,
    };

    // Check for specific priorities first
    let priority = customPriority[path];

    // If not found, use the default. (The '/reviews/*' pattern that used to
    // live here is gone with the routes: twelve pages that rendered nothing,
    // now permanently redirected to /recenze — see next.config.mjs.)
    if (!priority) {
      priority = config.priority;
    }

    return {
      loc: path,
      changefreq: config.changefreq,
      priority: priority,
      lastmod: new Date().toISOString(),
    };
  },
};