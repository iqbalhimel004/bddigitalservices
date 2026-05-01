import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, KeyRound, Mail, Server, Zap, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useAdminLogin();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/me", { credentials: "include" })
      .then((res) => {
        if (!cancelled && res.ok) setLocation("/admin/dashboard");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [location, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: () => {
          localStorage.setItem("admin_logged_in", "1");
          toast({
            title: "লগইন সফল হয়েছে",
            description: "Admin panel এ স্বাগতম।",
          });
          setLocation("/admin/dashboard");
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number } | null)?.status;
          const message =
            status === 429
              ? "অনেকবার ভুল চেষ্টা — কিছুক্ষণ পর আবার চেষ্টা করুন।"
              : "ভুল username বা password। আবার চেষ্টা করুন।";
          toast({
            title: "লগইন ব্যর্থ হয়েছে",
            description: message,
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Helmet>
        <title>Admin Login | BD Digital Services</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 mb-5 shadow-lg shadow-violet-500/20">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">BD Digital Services</h1>
          <p className="text-sm text-slate-400 mt-1">Admin Portal</p>
        </div>

        <Card className="bg-slate-900/80 border border-slate-700/60 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-1 pt-6 px-6">
            <h2 className="text-lg font-semibold text-white text-center">লগইন করুন</h2>
            <p className="text-xs text-slate-400 text-center mt-1">Admin panel অ্যাক্সেস করতে ক্রেডেনশিয়াল দিন</p>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm text-slate-300">Username / Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="আপনার username বা email"
                    className="pl-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="আপনার password"
                    className="pl-10 pr-10 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <ForgotPasswordDialog />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold border-0 shadow-lg shadow-violet-500/20 transition-all duration-200"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "লগইন হচ্ছে..." : "লগইন করুন"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} BD Digital Services. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function ForgotPasswordDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-violet-400 hover:text-violet-300 hover:underline font-medium transition-colors"
        >
          Password ভুলে গেছেন?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-500" />
            Password রিসেট করুন
          </DialogTitle>
          <DialogDescription>
            আপনার admin password পরিবর্তন করতে নিচের পদ্ধতি অনুসরণ করুন।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-4 space-y-3">
            {[
              { num: "১", title: "Hosting Control Panel খুলুন", desc: "Hostinger বা আপনার hosting provider এ লগইন করুন।" },
              { num: "২", title: "Environment Variables খুঁজুন", desc: (<>Node.js app settings এ গিয়ে <code className="bg-muted px-1 rounded text-xs">ADMIN_PASSWORD</code> ভেরিয়েবল পরিবর্তন করুন।</>) },
              { num: "৩", title: "App রিস্টার্ট করুন", desc: "নতুন password দিয়ে app পুনরায় চালু করুন।" },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">{step.num}</div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3 flex items-start gap-3">
            <Mail className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium">সহায়তার জন্য যোগাযোগ করুন</p>
              <a
                href="mailto:bddigitalservices02@gmail.com"
                className="text-xs text-cyan-500 hover:underline font-medium"
              >
                bddigitalservices02@gmail.com
              </a>
            </div>
          </div>

          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 flex items-start gap-3">
            <Server className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">বর্তমান username:</span>{" "}
              <code className="bg-muted px-1 rounded">ADMIN_USERNAME</code> এনভায়রনমেন্ট ভেরিয়েবল দিয়ে নিয়ন্ত্রিত।
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
