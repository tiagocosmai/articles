import type { LoadedContent, Locale } from "../types/content";

const ORIGIN = "https://tiagocosmai.github.io";
const LOCALES: Locale[] = ["pt", "en", "es"];
const STATIC_PATHS = [
  "/",
  "/pt/",
  "/en/",
  "/es/",
  "/pt/blog",
  "/en/blog",
  "/es/blog",
  "/curriculo",
  "/curriculo/en",
  "/curriculo/es",
];

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildSitemap(content: LoadedContent): string {
  const locations = new Set(STATIC_PATHS.map((path) => new URL(path, ORIGIN).toString()));
  for (const article of content.articles) {
    const slug = encodeURIComponent(article.slug);
    for (const locale of LOCALES) {
      locations.add(`${ORIGIN}/${locale}/blog/${slug}`);
    }
  }

  const urls = [...locations].sort().map((location) => `  <url><loc>${xmlEscape(location)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function buildGeneratedBlogCatalog(content: LoadedContent): string {
  const articles = content.articles.map((article) => ({
    slug: article.slug,
    locales: Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        {
          title: article.locales[locale].title,
          description: article.locales[locale].description,
        },
      ]),
    ),
  }));
  return `${JSON.stringify({ articles }, null, 2)}\n`;
}
