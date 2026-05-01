import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { usePageTracking } from "@/hooks/usePageTracking";

import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";

const AdminLogin      = lazy(() => import("@/pages/admin/login"));
const AdminDashboard  = lazy(() => import("@/pages/admin/dashboard"));
const AdminProducts   = lazy(() => import("@/pages/admin/products"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminNotices    = lazy(() => import("@/pages/admin/notices"));
const AdminFaqs       = lazy(() => import("@/pages/admin/faqs"));
const AdminSettings   = lazy(() => import("@/pages/admin/settings"));
const AdminOrders     = lazy(() => import("@/pages/admin/orders"));
const AdminAnalytics  = lazy(() => import("@/pages/admin/analytics"));
const NotFound        = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function Router() {
  usePageTracking();

  return (
    <Suspense fallback={<PageSpinner />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/notices" component={AdminNotices} />
        <Route path="/admin/faqs" component={AdminFaqs} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
}

export default App;
