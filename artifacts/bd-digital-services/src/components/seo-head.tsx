import { Helmet } from "react-helmet-async";

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SITE_NAME = "BD Digital Services";
const SITE_URL = "https://bddigitalservices.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

const DEFAULT_TITLE = "BD Digital Services | বাংলাদেশের সেরা ডিজিটাল পণ্য মার্কেটপ্লেস";
const DEFAULT_DESCRIPTION =
  "BD Digital Services — বাংলাদেশের বিশ্বস্ত ডিজিটাল পণ্য মার্কেটপ্লেস। Netflix, Spotify, ChatGPT, ক্রেডিট কার্ড, ভার্চুয়াল কার্ড সহ সব ধরনের ডিজিটাল সেবা সর্বনিম্ন মূল্যে। বিকাশ, নগদ ও রকেটে পেমেন্ট সুবিধা।";
const DEFAULT_KEYWORDS =
  "ডিজিটাল পণ্য বাংলাদেশ, Netflix Bangladesh, Spotify Bangladesh, ChatGPT Bangladesh, virtual card Bangladesh, digital marketplace BD, বিকাশ পেমেন্ট, BD Digital Services, bddigitalservices, ভার্চুয়াল কার্ড বাংলাদেশ";

export function SeoHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalUrl = SITE_URL,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
}: SeoHeadProps) {
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${SITE_NAME} — Bangladesh Digital Marketplace`} />
      <meta property="og:locale" content="bn_BD" />
      <meta property="og:locale:alternate" content="en_US" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${SITE_NAME} — Bangladesh Digital Marketplace`} />
    </Helmet>
  );
}
