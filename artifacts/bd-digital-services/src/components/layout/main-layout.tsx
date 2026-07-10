import { useState } from "react";
import { Link } from "wouter";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { MessageCircle, Send, Menu, X, Facebook, Sun, Moon, Instagram, Music2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const whatsappLink = settings?.whatsapp || "https://wa.me/8801572792499";
  // Default must match the JSON-LD default in home.tsx; t.me/+<phone> is not a valid username link.
  const telegramLink = settings?.telegram || "https://t.me/bddigitalservices";
  const facebookLink = settings?.facebook || "";
  const messengerLink = settings?.messenger || "";
  const twitterLink = settings?.twitter || "";
  const instagramLink = settings?.instagram || "";
  const tiktokLink = settings?.tiktok || "";

  // Use "/#section" so these anchors work from every page (e.g. /products/:id),
  // not only on the homepage. BASE_URL keeps them correct under a sub-path.
  const base = import.meta.env.BASE_URL;
  const navLinks = [
    { href: `${base}#products`, label: "Products" },
    { href: `${base}#how-to-order`, label: "How to Order" },
    { href: `${base}#order-form`, label: "Order" },
    { href: `${base}#faq`, label: "FAQ" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass-card border-b border-border/30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="text-xl md:text-2xl font-bold cursor-pointer gradient-text tracking-tight">
              {settings?.siteName || "BD Digital Services"}
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-1">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-all duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 bg-[#22C55E] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#16A34A] transition-all hover:-translate-y-px shadow-md shadow-green-900/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer — slides down from header */}
        <div
          className={`md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="py-2.5 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-border/50 space-y-3">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#22C55E] text-white px-2.5 py-2 rounded-xl font-medium text-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" /> WhatsApp
                    </a>
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#0088cc] text-white px-2.5 py-2 rounded-xl font-medium text-xs"
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" /> Telegram
                    </a>
                  </div>
                  {messengerLink && (
                    <a
                      href={messengerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 bg-[#0084FF] text-white px-2.5 py-2 rounded-xl font-medium text-xs"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.17 5.52 3.07 7.38.15.14.24.34.24.56l.05 1.76a.8.8 0 001.12.7l1.96-.87a.8.8 0 01.54-.04 10.28 10.28 0 002.97.43c5.64 0 10-4.13 10-9.7S17.64 2 12 2zm5.98 7.55l-2.93 4.64a1.5 1.5 0 01-2.16.4l-2.33-1.75a.6.6 0 00-.72 0l-3.15 2.39c-.42.32-.97-.17-.7-.63l2.93-4.64a1.5 1.5 0 012.16-.4l2.33 1.75a.6.6 0 00.72 0l3.15-2.39c.42-.32.97.17.7.63z" />
                      </svg>
                      Messenger
                    </a>
                  )}
                </div>
              </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative overflow-hidden bg-gradient-to-b from-[#0d1525] to-[#070c18] border-t border-white/[0.07] text-slate-300">
        {/* Ambient glow blobs — decorative only */}
        <div className="absolute -left-16 -top-8 w-80 h-48 bg-primary/[0.12] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-12 bottom-0 w-64 h-36 bg-secondary/[0.09] rounded-full blur-3xl pointer-events-none" />

        {/* Top accent line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        {/* Extra bottom padding on mobile keeps the copyright row clear of the floating buttons */}
        <div className="relative container mx-auto px-4 pt-8 pb-24 md:py-10">

          {/* Row 1: Brand + Social buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
            <div className="flex flex-col items-center sm:items-start gap-0.5">
              <div className="text-xl font-bold tracking-tight gradient-text">
                {settings?.siteName || "BD Digital Services"}
              </div>
              <p className="text-[11px] text-slate-500 tracking-wide hidden sm:block">Bangladesh&apos;s Trusted Digital Marketplace</p>
            </div>
            {/* md:pr-16 keeps the right-most social button clear of the fixed floating action buttons */}
            <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2 md:pr-16">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex items-center gap-1.5 bg-[#22C55E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#16A34A] hover:scale-105 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="flex items-center gap-1.5 bg-[#0088cc] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#006fab] hover:scale-105 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Telegram
              </a>
              {facebookLink && (
                <a
                  href={facebookLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex items-center gap-1.5 bg-[#1877F2] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#1565d8] hover:scale-105 transition-all"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  Facebook
                </a>
              )}
              {twitterLink && (
                <a
                  href={twitterLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                  className="flex items-center gap-1.5 bg-[#1D9BF0] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#1a8cd8] hover:scale-105 transition-all"
                >
                  {/* X (Twitter) brand logo — lucide's "X" is a close icon, not the brand mark */}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
                  </svg>
                  X
                </a>
              )}
              {instagramLink && (
                <a
                  href={instagramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex items-center gap-1.5 bg-[#E1306C] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#c92761] hover:scale-105 transition-all"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  Instagram
                </a>
              )}
              {tiktokLink && (
                <a
                  href={tiktokLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="flex items-center gap-1.5 bg-[#FF0050] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#d4004a] hover:scale-105 transition-all"
                >
                  <Music2 className="w-3.5 h-3.5" />
                  TikTok
                </a>
              )}
            </div>
          </div>

          {/* Gradient divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent mb-5" />

          {/* Row 2: Nav links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-6">
            {[
              { href: `${base}#products`, label: "Products" },
              { href: `${base}#how-to-order`, label: "How to Order" },
              { href: `${base}#faq`, label: "FAQ" },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-slate-400 hover:text-white transition-colors tracking-wide"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Bottom divider */}
          <div className="w-full h-px bg-white/[0.07] mb-4" />

          {/* Row 3: Copyright + Trust note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs text-slate-500 pr-12 md:pr-16">
            <span>&copy; {new Date().getFullYear()} {settings?.siteName || "BD Digital Services"}. All rights reserved.</span>
            <span className="font-bn">বাংলাদেশের যাচাইকৃত ডিজিটাল মার্কেটপ্লেস — ১০০% নিরাপদ ও বিশ্বস্ত লেনদেন।</span>
          </div>

        </div>
      </footer>

      {/* Floating Action Buttons — anchored to the bottom-right corner and kept
          compact on small screens so they don't overlap product card buttons. */}
      <div className="fixed bottom-4 md:bottom-6 right-3 md:right-6 flex flex-col gap-2.5 md:gap-4 z-50">
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#0088cc] text-white p-2.5 md:p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
          aria-label="Telegram"
        >
          <Send className="w-4 h-4 md:w-5 md:h-5" />
        </a>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#22C55E] text-white p-2.5 md:p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
        </a>
        {messengerLink && (
          <a
            href={messengerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0084FF] text-white p-2.5 md:p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
            aria-label="Messenger"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.9 1.17 5.52 3.07 7.38.15.14.24.34.24.56l.05 1.76a.8.8 0 001.12.7l1.96-.87a.8.8 0 01.54-.04 10.28 10.28 0 002.97.43c5.64 0 10-4.13 10-9.7S17.64 2 12 2zm5.98 7.55l-2.93 4.64a1.5 1.5 0 01-2.16.4l-2.33-1.75a.6.6 0 00-.72 0l-3.15 2.39c-.42.32-.97-.17-.7-.63l2.93-4.64a1.5 1.5 0 012.16-.4l2.33 1.75a.6.6 0 00.72 0l3.15-2.39c.42-.32.97.17.7.63z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
