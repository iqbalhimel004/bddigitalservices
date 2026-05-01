import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { 
  useGetActiveNotice, 
  getGetActiveNoticeQueryKey,
  useCreateNotice
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Megaphone } from "lucide-react";

export default function AdminNotices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [messageBn, setMessageBn] = useState("");
  const [messageEn, setMessageEn] = useState("");
  const [isActive, setIsActive] = useState(true);

  useAdminAuth();

  const { data: activeNotice, isLoading } = useGetActiveNotice({
    query: { queryKey: getGetActiveNoticeQueryKey() }
  });

  useEffect(() => {
    if (activeNotice) {
      setMessageBn(activeNotice.messageBn);
      setMessageEn(activeNotice.messageEn);
      setIsActive(activeNotice.isActive);
    }
  }, [activeNotice]);

  const createMutation = useCreateNotice();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createMutation.mutate(
      { data: { messageBn, messageEn, isActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetActiveNoticeQueryKey() });
          toast({ title: "Notice updated successfully" });
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <AdminPageHeader
          title="Announcement Notice"
          description="Manage the scrolling announcement banner shown to visitors."
        />

        {activeNotice && activeNotice.isActive && (
          <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-primary/30 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Currently Active Notice</p>
              <p className="text-sm font-medium text-foreground">{activeNotice.messageEn}</p>
              <p className="text-sm font-bn text-muted-foreground mt-0.5">{activeNotice.messageBn}</p>
            </div>
          </div>
        )}

        <Card className="border border-border/60 bg-card/80">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Update Notice</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  This creates a new notice and archives the previous one.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="messageEn" className="text-sm font-medium">Message (English) *</Label>
                <Textarea 
                  id="messageEn" 
                  value={messageEn} 
                  onChange={(e) => setMessageEn(e.target.value)} 
                  rows={3}
                  required
                  placeholder="Enter the announcement message in English..."
                  className="resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="messageBn" className="text-sm font-medium font-bn">Message (Bangla) *</Label>
                <Textarea 
                  id="messageBn" 
                  value={messageBn} 
                  onChange={(e) => setMessageBn(e.target.value)} 
                  rows={3}
                  required 
                  className="font-bn resize-none"
                  placeholder="বাংলায় ঘোষণার বার্তা লিখুন..."
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/40">
                <div>
                  <p className="text-sm font-medium">Show on website</p>
                  <p className="text-xs text-muted-foreground">Display this notice in the scrolling banner</p>
                </div>
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || isLoading}>
                {createMutation.isPending ? "Publishing..." : "Publish Notice"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
