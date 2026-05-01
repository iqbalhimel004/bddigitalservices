import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, productsTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

const SITE_URL = "https://bddigitalservices.com";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDate(d: Date | string | number | null | undefined): string {
  const date = d ? new Date(d) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  try {
    const products = await db
      .select({
        id: productsTable.id,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .where(eq(productsTable.isActive, true))
      .orderBy(desc(productsTable.createdAt));

    const categories = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.isActive, true));

    const newestProductDate = products[0]?.createdAt
      ? isoDate(products[0].createdAt as unknown as string)
      : isoDate(new Date());

    const urls: string[] = [];
    urls.push(`  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${newestProductDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

    for (const c of categories) {
      urls.push(`  <url>
    <loc>${SITE_URL}/?category=${c.id}</loc>
    <lastmod>${newestProductDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    for (const p of products) {
      urls.push(`  <url>
    <loc>${SITE_URL}/products/${p.id}</loc>
    <lastmod>${isoDate(p.createdAt as unknown as string)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    // Avoid crashing the response — emit a minimal valid sitemap on DB failure.
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
</urlset>
`);
  }
});

// Suppress unused import warning for sql when not referenced
void sql;

export default router;
