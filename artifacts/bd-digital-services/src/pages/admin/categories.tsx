import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { 
  useListCategories, 
  getListCategoriesQueryKey,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Category, CreateCategoryBody } from "@workspace/api-client-react";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [nameBn, setNameBn] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [isActive, setIsActive] = useState(true);

  useAdminAuth();

  const { data: categories, isLoading } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const resetForm = () => {
    setEditingCategory(null);
    setNameBn("");
    setNameEn("");
    setSlug("");
    setIcon("");
    setSortOrder("0");
    setIsActive(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setNameBn(category.nameBn);
    setNameEn(category.nameEn);
    setSlug(category.slug);
    setIcon(category.icon);
    setSortOrder(category.sortOrder.toString());
    setIsActive(category.isActive);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: CreateCategoryBody = {
      nameBn,
      nameEn,
      slug,
      icon,
      sortOrder: parseInt(sortOrder) || 0,
      isActive,
    };

    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            toast({ title: "Category updated successfully" });
            setIsModalOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            toast({ title: "Category created successfully" });
            setIsModalOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: "Category deleted successfully" });
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Categories"
          description="Manage product categories."
          action={
            <Dialog open={isModalOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              setIsModalOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">Name (English) *</Label>
                    <Input id="nameEn" value={nameEn} onChange={(e) => {
                      setNameEn(e.target.value);
                      if (!editingCategory) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }} required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nameBn" className="font-bn">Name (Bangla) *</Label>
                    <Input id="nameBn" value={nameBn} onChange={(e) => setNameBn(e.target.value)} required className="font-bn" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icon">Icon (text/emoji) *</Label>
                      <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sortOrder">Sort Order</Label>
                      <Input id="sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 py-2">
                    <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingCategory ? "Update Category" : "Create Category"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="rounded-xl border border-border/60 bg-card/80 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60 bg-muted/20">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pl-4">Icon</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slug</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : categories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No categories found. Create one!</TableCell>
                </TableRow>
              ) : (
                categories?.sort((a, b) => a.sortOrder - b.sortOrder).map((category) => (
                  <TableRow key={category.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors last:border-0">
                    <TableCell className="text-2xl pl-4 py-3">{category.icon}</TableCell>
                    <TableCell className="py-3">
                      <div className="font-medium text-sm">{category.nameEn}</div>
                      <div className="text-xs text-muted-foreground font-bn">{category.nameBn}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{category.slug}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-3">{category.sortOrder}</TableCell>
                    <TableCell className="py-3">
                      {category.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => handleOpenEdit(category)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete category?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{category.nameEn}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
