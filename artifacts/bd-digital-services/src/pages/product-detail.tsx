import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { SeoHead } from "@/components/seo-head";
import { MainLayout } from "@/components/layout/main-layout";
import { useGetProduct, getGetProductQueryKey, useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";

const SITE_URL = "https://bddigitalservices.com";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const idParam = params?.id;
  const id = idParam ? Number(idParam) : NaN;
  const isValidId = Number.isFinite(id) && id > 0;

  const { data: product, isLoading, error } = useGetProduct(
    isValidId ? id : 0,
    {
      query: {
        queryKey: getGetProductQueryKey(isValidId ? id : 0),
        enabled: isValidId,
      },
    },
  );
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const whatsappLink = settings?.whatsapp || "https://wa.me/8801572792499";

  if (!isValidId) return <NotFound />;
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Loading…
        </div>
      </MainLayout>
    );
  }
  if (error || !product) return <NotFound />;

  const canonical = `${SITE_URL}/products/${product.id}`;
  const priceNum = parseFloat(String(product.priceBdt ?? 0));
  const priceDisplay = priceNum > 0 ? `৳${product.priceBdt}` : "Contact for price";
  const productImageUrl = (product as { imageUrl?: string | null }).imageUrl ?? null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.nameEn,
    "description": product.descriptionEn || `Buy ${product.nameEn} at the best price in Bangladesh`,
    "url": canonical,
    ...(productImageUrl ? { image: productImageUrl } : {}),
    "brand": { "@type": "Brand", "name": "BD Digital Services" },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "BDT",
      ...(priceNum > 0 ? { price: String(product.priceBdt) } : {}),
      "availability": "https://schema.org/InStock",
      "url": canonical,
      "seller": { "@type": "Organization", "name": "BD Digital Services" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": product.nameEn, "item": canonical },
    ],
  };

  return (
    <MainLayout>
      <SeoHead
        title={`${product.nameEn} | BD Digital Services`}
        description={product.descriptionEn ?? `Buy ${product.nameEn} from BD Digital Services.`}
        canonicalUrl={canonical}
        ogImage={productImageUrl ?? `${SITE_URL}/opengraph.jpg`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <section className="container mx-auto px-4 py-10 max-w-4xl">
        <Link href="/">
          <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to all products
          </a>
        </Link>

        <article className="bg-card border border-border rounded-2xl p-6 md:p-8">
          {product.categoryNameEn && (
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-2">
              {product.categoryNameEn}
            </p>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{product.nameEn}</h1>
          {product.nameBn && (
            <p className="text-lg text-muted-foreground font-bn mb-4">{product.nameBn}</p>
          )}

          <div className="flex items-baseline gap-3 my-6">
            <span className="text-3xl font-bold text-foreground">{priceDisplay}</span>
            {priceNum > 0 && parseFloat(String(product.priceUsd ?? 0)) > 0 && (
              <span className="text-sm text-muted-foreground">${product.priceUsd}</span>
            )}
          </div>

          {product.descriptionEn && (
            <p className="text-muted-foreground leading-relaxed mb-3">{product.descriptionEn}</p>
          )}
          {product.descriptionBn && (
            <p className="text-muted-foreground font-bn leading-relaxed mb-6">{product.descriptionBn}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button asChild className="flex-1">
              <Link href="/#order">Place Order</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" /> Order via WhatsApp
              </a>
            </Button>
          </div>
        </article>
      </section>
    </MainLayout>
  );
}
