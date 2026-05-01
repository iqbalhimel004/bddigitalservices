import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Bell, 
  Settings, 
  ShoppingCart,
  LogOut,
  Menu,
  X,
  BarChart2,
  Zap,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!wasDark) root.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      const csrf = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
        headers: csrf ? { "x-csrf-token": decodeURIComponent(csrf[1]) } : {},
      });
    } catch {
      // best-effort
    }
    localStorage.removeItem("admin_logged_in");
    setLocation("/admin");
  };

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/categories", label: "Categories", icon: Tags },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/notices", label: "Notices", icon: Bell },
    { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 shrink-0">
          <Zap className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground leading-tight tracking-tight">BD Digital</p>
          <p className="text-[11px] text-muted-foreground leading-tight">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Navigation</p>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                )}
                <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span className="text-sm">{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3 ml-auto text-primary/60" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border/60 space-y-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">A</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground leading-tight">Admin</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Helmet>
        <title>Admin Panel | BD Digital Services</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border/60 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-sm tracking-tight">BD Digital Admin</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
        </Button>
      </div>

      {/* Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-over Sidebar */}
      <div className={`
        md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border/60 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-card border-r border-border/60 shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-5 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
