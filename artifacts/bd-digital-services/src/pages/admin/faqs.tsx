import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  useListAllFaqs,
  getListAllFaqsQueryKey,
  getListFaqsQueryKey,
  useCreateFaq,
  useUpdateFaq,
  useDeleteFaq,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, HelpCircle, Eye, EyeOff } from "lucide-react";
import type { Faq, CreateFaqBody } from "@workspace/api-client-react";

const EMPTY_FORM: CreateFaqBody = {
  questionEn: "",
  questionBn: "",
  answerEn: "",
  answerBn: "",
  sortOrder: 0,
  isActive: true,
};

export default function AdminFaqs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useAdminAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [form, setForm] = useState<CreateFaqBody>(EMPTY_FORM);

  const { data: faqs, isLoading } = useListAllFaqs({
    query: { queryKey: getListAllFaqsQueryKey() },
  });

  const createMutation = useCreateFaq();
  const updateMutation = useUpdateFaq();
  const deleteMutation = useDeleteFaq();

  const resetForm = () => {
    setEditingFaq(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setForm({
      questionEn: faq.questionEn,
      questionBn: faq.questionBn,
      answerEn: faq.answerEn,
      answerBn: faq.answerBn,
      sortOrder: faq.sortOrder,
      isActive: faq.isActive,
    });
    setIsModalOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListAllFaqsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListFaqsQueryKey() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.questionEn.trim() || !form.questionBn.trim() || !form.answerEn.trim() || !form.answerBn.trim()) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }

    if (editingFaq) {
      updateMutation.mutate(
        { id: editingFaq.id, data: form },
        {
          onSuccess: () => {
            toast({ title: "FAQ আপডেট হয়েছে" });
            invalidate();
            setIsModalOpen(false);
            resetForm();
          },
          onError: () => toast({ title: "আপডেট করা সম্ভব হয়নি", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data: form },
        {
          onSuccess: () => {
            toast({ title: "নতুন FAQ যোগ হয়েছে" });
            invalidate();
            setIsModalOpen(false);
            resetForm();
          },
          onError: () => toast({ title: "যোগ করা সম্ভব হয়নি", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "FAQ মুছে ফেলা হয়েছে" });
          invalidate();
        },
        onError: () => toast({ title: "মুছে ফেলা সম্ভব হয়নি", variant: "destructive" }),
      }
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <AdminPageHeader
          title="FAQ Management"
          description="Homepage-এর Frequently Asked Questions পরিচালনা করুন।"
          action={
            <Button onClick={openCreate} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> নতুন FAQ
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : faqs && faqs.length > 0 ? (
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={faq.id}
                className="bg-card border border-border/60 rounded-xl p-5 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-sm text-foreground leading-snug">
                          {faq.questionEn}
                        </p>
                        {faq.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-semibold border border-green-500/20">
                            <Eye className="w-2.5 h-2.5" /> সক্রিয়
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold border border-border/60">
                            <EyeOff className="w-2.5 h-2.5" /> নিষ্ক্রিয়
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-bn mb-2">{faq.questionBn}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{faq.answerEn}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(faq)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>FAQ মুছে ফেলবেন?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{faq.questionEn}" — এই FAQ স্থায়ীভাবে মুছে যাবে।
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(faq.id)}
                          >
                            মুছে ফেলুন
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <HelpCircle className="h-12 w-12 opacity-20" />
            <p className="text-sm">কোনো FAQ নেই। নতুন FAQ যোগ করুন।</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "FAQ সম্পাদনা" : "নতুন FAQ যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  প্রশ্ন (ইংরেজি) *
                </Label>
                <Input
                  value={form.questionEn}
                  onChange={(e) => setForm((p) => ({ ...p, questionEn: e.target.value }))}
                  placeholder="How long does delivery take?"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  প্রশ্ন (বাংলা) *
                </Label>
                <Input
                  value={form.questionBn}
                  onChange={(e) => setForm((p) => ({ ...p, questionBn: e.target.value }))}
                  placeholder="ডেলিভারি কতক্ষণ লাগবে?"
                  className="font-bn"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                উত্তর (ইংরেজি) *
              </Label>
              <Textarea
                value={form.answerEn}
                onChange={(e) => setForm((p) => ({ ...p, answerEn: e.target.value }))}
                placeholder="Most products are delivered within 5-30 minutes..."
                rows={3}
                className="resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                উত্তর (বাংলা) *
              </Label>
              <Textarea
                value={form.answerBn}
                onChange={(e) => setForm((p) => ({ ...p, answerBn: e.target.value }))}
                placeholder="অধিকাংশ প্রোডাক্ট ৫-৩০ মিনিটের মধ্যে..."
                rows={3}
                className="resize-none font-bn"
                required
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ক্রম (Sort Order)
                </Label>
                <Input
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch
                  checked={form.isActive ?? true}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
                <Label className="text-sm">সক্রিয়</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                বাতিল
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "সংরক্ষণ হচ্ছে..." : editingFaq ? "আপডেট করুন" : "যোগ করুন"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
