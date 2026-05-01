import { useState } from "react";
import { Link } from "wouter";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { MessageCircle, Send, Menu, X, Facebook, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const whatsappLink = settings?.whatsapp || "https://wa.me/8801572792499";
  const telegramLink = settings?.telegram || "https://t.me/+8801572792499";
  const facebookLink = settings?.facebook || "";

  const navLinks = [
    { href: "#products", label: "Products" },
    { href: "#how-to-order", label: "How to Order" },
    { href: "#faq", label: "FAQ" },
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
              className="flex items-center gap-2 bg-[#22C55E] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#16A34A] transition-all hover:-translate-y-px shadow-md shadow-green-900/20"
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
                <div className="flex gap-2">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#22C55E] text-white px-4 py-2.5 rounded-xl font-medium text-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#0088cc] text-white px-4 py-2.5 rounded-xl font-medium text-sm"
                  >
                    <Send className="w-4 h-4" /> Telegram
                  </a>
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
      <footer className="bg-card text-muted-foreground border-t border-border">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="container mx-auto px-4 py-5">

          {/* Row 1: Brand + Social icons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
            <div className="text-xl font-bold tracking-tight gradient-text">
              {settings?.siteName || "BD Digital Services"}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex items-center gap-1.5 bg-[#22C55E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#16A34A] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="flex items-center gap-1.5 bg-[#0088cc] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#006fab] transition-colors"
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
                  className="flex items-center gap-1.5 bg-[#1877F2] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#1565d8] transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  Facebook
                </a>
              )}
            </div>
          </div>

          {/* Row 2: Nav links */}
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-4">
            {[
              { href: "#products", label: "Products" },
              { href: "#how-to-order", label: "How to Order" },
              { href: "#faq", label: "FAQ" },
              { href: whatsappLink, label: "WhatsApp", external: true },
              { href: telegramLink, label: "Telegram", external: true },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                {...("external" in link && link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Divider */}
          <div className="w-full h-px bg-border/40 mb-3" />

          {/* Row 3: Copyright + Trust note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground/50">
            <span>&copy; {new Date().getFullYear()} {settings?.siteName || "BD Digital Services"}. All rights reserved.</span>
            <span className="font-bn">বাংলাদেশের যাচাইকৃত ডিজিটাল মার্কেটপ্লেস — ১০০% নিরাপদ ও বিশ্বস্ত লেনদেন।</span>
          </div>

        </div>
      </footer>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 flex flex-col gap-4 z-50">
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#0088cc] text-white p-2.5 md:p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
          aria-label="Telegram"
        >
          <Send className="w-5 h-5" />
        </a>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#22C55E] text-white p-2.5 md:p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
