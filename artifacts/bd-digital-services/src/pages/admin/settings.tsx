import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { 
  useGetSettings, 
  getGetSettingsQueryKey,
  useUpdateSettings,
  useChangeAdminCredentials,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { SiteSettings } from "@workspace/api-client-react";
import { KeyRound, Globe, CreditCard, Palette, ListOrdered, MessageSquare, ToggleLeft } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [credForm, setCredForm] = useState({
    currentPassword: "",
    newUsername: "",
    newPassword: "",
    confirmPassword: "",
  });

  const changeCredsMutation = useChangeAdminCredentials();

  const { username: currentUsername } = useAdminAuth();

  const handleCredChange = (field: keyof typeof credForm, value: string) => {
    setCredForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCredSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (credForm.newPassword && credForm.newPassword !== credForm.confirmPassword) {
      toast({ title: "নতুন password মিলছে না", variant: "destructive" });
      return;
    }
    const trimmedUsername = credForm.newUsername.trim();
    const usernameChanged = trimmedUsername && trimmedUsername !== currentUsername;
    changeCredsMutation.mutate(
      {
        data: {
          currentPassword: credForm.currentPassword,
          newUsername: usernameChanged ? trimmedUsername : undefined,
          newPassword: credForm.newPassword || undefined,
          confirmPassword: credForm.confirmPassword || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast({ title: data.message });
          setCredForm((prev) => ({
            currentPassword: "",
            newUsername: prev.newUsername,
            newPassword: "",
            confirmPassword: "",
          }));
        },
        onError: (err: unknown) => {
          const apiErr = err as { data?: { error?: string }; message?: string };
          const msg = apiErr?.data?.error ?? apiErr?.message ?? "পরিবর্তন করা সম্ভব হয়নি";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  const [formData, setFormData] = useState<SiteSettings>({
    siteName: "",
    whatsapp: "",
    telegram: "",
    facebook: "",
    bkashNumber: "",
    nagadNumber: "",
    rocketNumber: "",
    footerText: "",
    primaryColor: "",
    secondaryColor: "",
    accentColor: "",
    heroBadge: "",
    heroTitle: "",
    heroTitleHighlight: "",
    heroSubtitle: "",
    heroPrimaryBtn: "",
    heroWhatsappBtn: "",
    heroStat1Value: "",
    heroStat1Label: "",
    heroStat2Value: "",
    heroStat2Label: "",
    heroStat3Value: "",
    heroStat3Label: "",
    heroStat4Value: "",
    heroStat4Label: "",
    howToOrderStep1Title: "",
    howToOrderStep1Desc: "",
    howToOrderStep2Title: "",
    howToOrderStep2Desc: "",
    howToOrderStep3Title: "",
    howToOrderStep3Desc: "",
    whatsappGenericMsg: "",
    whatsappProductMsg: "",
    bkashEnabled: "true",
    nagadEnabled: "true",
    rocketEnabled: "true",
    bkashLabel: "",
    nagadLabel: "",
    rocketLabel: "",
  });

  useEffect(() => {
    if (currentUsername) {
      setCredForm((prev) => ({ ...prev, newUsername: currentUsername }));
    }
  }, [currentUsername]);

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useUpdateSettings();

  const handleInputChange = (field: keyof SiteSettings, value: string) => {
    setFormData((prev: SiteSettings) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Settings updated successfully" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  const heroStats = [
    { valueKey: "heroStat1Value" as keyof SiteSettings, labelKey: "heroStat1Label" as keyof SiteSettings, placeholder: { value: "1000+", label: "সন্তুষ্ট গ্রাহক" } },
    { valueKey: "heroStat2Value" as keyof SiteSettings, labelKey: "heroStat2Label" as keyof SiteSettings, placeholder: { value: "15+", label: "প্রোডাক্ট" } },
    { valueKey: "heroStat3Value" as keyof SiteSettings, labelKey: "heroStat3Label" as keyof SiteSettings, placeholder: { value: "24/7", label: "সাপোর্ট" } },
    { valueKey: "heroStat4Value" as keyof SiteSettings, labelKey: "heroStat4Label" as keyof SiteSettings, placeholder: { value: "5-30 Min", label: "ডেলিভারি" } },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl">
        <AdminPageHeader
          title="Settings"
          description="Manage global site settings, contact details, and admin credentials."
        />

        {/* Login Details */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Security</p>
          <form onSubmit={handleCredSubmit}>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <KeyRound className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Login Details</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Admin username ও password পরিবর্তন করুন। বর্তমান password দিয়ে verify করতে হবে।</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium">বর্তমান Password *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={credForm.currentPassword}
                    onChange={(e) => handleCredChange("currentPassword", e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUsername" className="text-sm font-medium">নতুন Username — খালি রাখলে পরিবর্তন হবে না</Label>
                  <Input
                    id="newUsername"
                    type="text"
                    value={credForm.newUsername}
                    onChange={(e) => handleCredChange("newUsername", e.target.value)}
                    placeholder="নতুন username লিখুন"
                    autoComplete="username"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium">নতুন Password — খালি রাখলে পরিবর্তন হবে না</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={credForm.newPassword}
                      onChange={(e) => handleCredChange("newPassword", e.target.value)}
                      placeholder="কমপক্ষে ৮ অক্ষর"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">নতুন Password নিশ্চিত করুন</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={credForm.confirmPassword}
                      onChange={(e) => handleCredChange("confirmPassword", e.target.value)}
                      placeholder="পুনরায় লিখুন"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={changeCredsMutation.isPending || !credForm.currentPassword}>
                    {changeCredsMutation.isPending ? "পরিবর্তন হচ্ছে..." : "Login Details আপডেট করুন"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Hero Section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Homepage</p>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Globe className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Hero Section</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Edit the main banner text, stats, and button labels on the homepage.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="heroBadge" className="text-sm font-medium">Badge Text</Label>
                  <Input
                    id="heroBadge"
                    value={formData.heroBadge || ""}
                    onChange={(e) => handleInputChange("heroBadge", e.target.value)}
                    placeholder="Premium Digital Products Marketplace"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle" className="text-sm font-medium">Heading (Plain)</Label>
                    <Input
                      id="heroTitle"
                      value={formData.heroTitle || ""}
                      onChange={(e) => handleInputChange("heroTitle", e.target.value)}
                      placeholder="Your Trusted Source For"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroTitleHighlight" className="text-sm font-medium">Heading (Highlighted / Gradient)</Label>
                    <Input
                      id="heroTitleHighlight"
                      value={formData.heroTitleHighlight || ""}
                      onChange={(e) => handleInputChange("heroTitleHighlight", e.target.value)}
                      placeholder="Digital Services"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle" className="text-sm font-medium">Subtitle (Bangla)</Label>
                  <Textarea
                    id="heroSubtitle"
                    value={formData.heroSubtitle || ""}
                    onChange={(e) => handleInputChange("heroSubtitle", e.target.value)}
                    rows={2}
                    placeholder="বাংলাদেশের সবচেয়ে বিশ্বস্ত..."
                    className="resize-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroPrimaryBtn" className="text-sm font-medium">Primary Button Label</Label>
                    <Input
                      id="heroPrimaryBtn"
                      value={formData.heroPrimaryBtn || ""}
                      onChange={(e) => handleInputChange("heroPrimaryBtn", e.target.value)}
                      placeholder="Browse Products"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroWhatsappBtn" className="text-sm font-medium">WhatsApp Button Label</Label>
                    <Input
                      id="heroWhatsappBtn"
                      value={formData.heroWhatsappBtn || ""}
                      onChange={(e) => handleInputChange("heroWhatsappBtn", e.target.value)}
                      placeholder="Order via WhatsApp"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-medium mb-3">Stats Strip</p>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 border-b border-border/60">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-10">#</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Value</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label (Bangla)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {heroStats.map((stat, i) => (
                          <tr key={i} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground text-xs font-medium">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <Input
                                value={(formData[stat.valueKey] as string) || ""}
                                onChange={(e) => handleInputChange(stat.valueKey, e.target.value)}
                                placeholder={stat.placeholder.value}
                                className="h-8"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <Input
                                value={(formData[stat.labelKey] as string) || ""}
                                onChange={(e) => handleInputChange(stat.labelKey, e.target.value)}
                                placeholder={stat.placeholder.label}
                                className="h-8 font-bn"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer & Social Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Branding & Contact</p>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Globe className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Footer &amp; Social Links</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Site name, footer text, and all contact / social channel URLs.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName" className="text-sm font-medium">Site Name</Label>
                  <Input 
                    id="siteName" 
                    value={formData.siteName} 
                    onChange={(e) => handleInputChange("siteName", e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footerText" className="text-sm font-medium">Footer Text</Label>
                  <Textarea 
                    id="footerText" 
                    value={formData.footerText} 
                    onChange={(e) => handleInputChange("footerText", e.target.value)} 
                    rows={2}
                    required
                    className="resize-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp Link</Label>
                    <Input 
                      id="whatsapp" 
                      value={formData.whatsapp} 
                      onChange={(e) => handleInputChange("whatsapp", e.target.value)} 
                      placeholder="https://wa.me/..."
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram" className="text-sm font-medium">Telegram Link</Label>
                    <Input 
                      id="telegram" 
                      value={formData.telegram} 
                      onChange={(e) => handleInputChange("telegram", e.target.value)} 
                      placeholder="https://t.me/..."
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="text-sm font-medium">Facebook Page Link</Label>
                    <Input 
                      id="facebook" 
                      value={formData.facebook || ""} 
                      onChange={(e) => handleInputChange("facebook", e.target.value)} 
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Payments</p>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CreditCard className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Mobile banking numbers displayed to customers.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bkashNumber" className="text-sm font-medium">bKash Number</Label>
                    <Input 
                      id="bkashNumber" 
                      value={formData.bkashNumber} 
                      onChange={(e) => handleInputChange("bkashNumber", e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nagadNumber" className="text-sm font-medium">Nagad Number</Label>
                    <Input 
                      id="nagadNumber" 
                      value={formData.nagadNumber} 
                      onChange={(e) => handleInputChange("nagadNumber", e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rocketNumber" className="text-sm font-medium">Rocket Number</Label>
                    <Input 
                      id="rocketNumber" 
                      value={formData.rocketNumber} 
                      onChange={(e) => handleInputChange("rocketNumber", e.target.value)} 
                      required 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How to Order Steps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">How to Order</p>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <ListOrdered className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">How to Order — ৩টি ধাপ</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Homepage-এ "How to Order" section-এর ৩টি ধাপের শিরোনাম ও বিবরণ এডিট করুন।</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {[
                  { n: 1, titleKey: "howToOrderStep1Title" as keyof SiteSettings, descKey: "howToOrderStep1Desc" as keyof SiteSettings, titlePlaceholder: "Choose Product", descPlaceholder: "পছন্দের সার্ভিসটি সিলেক্ট করুন..." },
                  { n: 2, titleKey: "howToOrderStep2Title" as keyof SiteSettings, descKey: "howToOrderStep2Desc" as keyof SiteSettings, titlePlaceholder: "Send Payment", descPlaceholder: "বিকাশ, নগদ বা রকেটে পেমেন্ট করুন..." },
                  { n: 3, titleKey: "howToOrderStep3Title" as keyof SiteSettings, descKey: "howToOrderStep3Desc" as keyof SiteSettings, titlePlaceholder: "Receive Account", descPlaceholder: "৫-৩০ মিনিটের মধ্যে একাউন্ট বুঝে নিন..." },
                ].map((step) => (
                  <div key={step.n} className="rounded-lg border border-border/50 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ধাপ {step.n}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Title (English)</Label>
                        <Input
                          value={(formData[step.titleKey] as string) || ""}
                          onChange={(e) => handleInputChange(step.titleKey, e.target.value)}
                          placeholder={step.titlePlaceholder}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">বিবরণ (বাংলা)</Label>
                        <Input
                          value={(formData[step.descKey] as string) || ""}
                          onChange={(e) => handleInputChange(step.descKey, e.target.value)}
                          placeholder={step.descPlaceholder}
                          className="font-bn"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* WhatsApp Message Templates */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">WhatsApp Templates</p>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MessageSquare className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">WhatsApp Message Templates</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Product-specific template-এ <code className="bg-muted px-1 rounded text-xs">{"{"+"product{"}</code> ও <code className="bg-muted px-1 rounded text-xs">{"{"+"price{"}</code> placeholder ব্যবহার করুন।</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Generic Message (কোনো product select না করলে)</Label>
                  <Input
                    value={formData.whatsappGenericMsg || ""}
                    onChange={(e) => handleInputChange("whatsappGenericMsg", e.target.value)}
                    placeholder="Hello BD Digital Services, I want to order."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Product Message (product card থেকে order করলে)</Label>
                  <Textarea
                    value={formData.whatsappProductMsg || ""}
                    onChange={(e) => handleInputChange("whatsappProductMsg", e.target.value)}
                    placeholder="Hello BD Digital Services, I want to order: {product} (Price: ৳{price}). Please guide me."
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{"{"+"product{"} → product name, {"{"+"price{"} → price automatically replace হবে।</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Visibility */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Payment Method Labels</p>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <ToggleLeft className="h-4 w-4 text-pink-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Payment Method Labels & Visibility</CardTitle>
                    <CardDescription className="text-xs mt-0.5">প্রতিটি payment method-এর label এবং show/hide নিয়ন্ত্রণ করুন।</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {[
                  { key: "bkash" as const, color: "#E2136E", labelKey: "bkashLabel" as keyof SiteSettings, enabledKey: "bkashEnabled" as keyof SiteSettings, defaultLabel: "bKash · Personal" },
                  { key: "nagad" as const, color: "#F7941D", labelKey: "nagadLabel" as keyof SiteSettings, enabledKey: "nagadEnabled" as keyof SiteSettings, defaultLabel: "Nagad · Personal" },
                  { key: "rocket" as const, color: "#8C3494", labelKey: "rocketLabel" as keyof SiteSettings, enabledKey: "rocketEnabled" as keyof SiteSettings, defaultLabel: "Rocket · Personal" },
                ].map((pm) => (
                  <div key={pm.key} className="flex items-center gap-4 rounded-lg border border-border/50 p-4">
                    <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-extrabold text-white text-sm" style={{ backgroundColor: pm.color }}>
                      {pm.key[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={(formData[pm.labelKey] as string) || ""}
                        onChange={(e) => handleInputChange(pm.labelKey, e.target.value)}
                        placeholder={pm.defaultLabel}
                        className="h-8"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={(formData[pm.enabledKey] as string) === "true"}
                        onChange={(e) => handleInputChange(pm.enabledKey, e.target.checked ? "true" : "false")}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Show</span>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Theme Colors */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Advanced</p>
            <Card className="border border-border/60 bg-card/80">
              <CardHeader className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Palette className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Theme Colors</CardTitle>
                    <CardDescription className="text-xs mt-0.5">HSL color values for the site theme.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor" className="text-sm font-medium">Primary Color</Label>
                    <Input 
                      id="primaryColor" 
                      value={formData.primaryColor} 
                      onChange={(e) => handleInputChange("primaryColor", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor" className="text-sm font-medium">Secondary Color</Label>
                    <Input 
                      id="secondaryColor" 
                      value={formData.secondaryColor} 
                      onChange={(e) => handleInputChange("secondaryColor", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor" className="text-sm font-medium">Accent Color</Label>
                    <Input 
                      id="accentColor" 
                      value={formData.accentColor} 
                      onChange={(e) => handleInputChange("accentColor", e.target.value)} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pb-4">
            <Button type="submit" size="lg" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
