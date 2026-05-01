import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { 
  useListProducts, 
  getListProductsQueryKey,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListCategories,
  getListCategoriesQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Product, CreateProductBody } from "@workspace/api-client-react";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [nameBn, setNameBn] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionBn, setDescriptionBn] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priceBdt, setPriceBdt] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [badge, setBadge] = useState("");
  const [isActive, setIsActive] = useState(true);

  useAdminAuth();

  const { data: products, isLoading } = useListProducts(
    {}, 
    { query: { queryKey: getListProductsQueryKey() } }
  );

  const { data: categories } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const resetForm = () => {
    setEditingProduct(null);
    setNameBn("");
    setNameEn("");
    setDescriptionBn("");
    setDescriptionEn("");
    setCategoryId("");
    setPriceBdt("");
    setPriceUsd("");
    setBadge("");
    setIsActive(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setNameBn(product.nameBn);
    setNameEn(product.nameEn);
    setDescriptionBn(product.descriptionBn || "");
    setDescriptionEn(product.descriptionEn || "");
    setCategoryId(product.categoryId ? product.categoryId.toString() : "");
    setPriceBdt(product.priceBdt);
    setPriceUsd(product.priceUsd);
    setBadge(product.badge || "");
    setIsActive(product.isActive);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: CreateProductBody = {
      nameBn,
      nameEn,
      descriptionBn: descriptionBn || null,
      descriptionEn: descriptionEn || null,
      categoryId: categoryId && categoryId !== "none" ? parseInt(categoryId) : null,
      priceBdt,
      priceUsd,
      badge: badge || null,
      isActive,
    };

    if (editingProduct) {
      updateMutation.mutate(
        { id: editingProduct.id, data: payload },
        {
          onSuccess: () => {
            queryClient.refetchQueries({ queryKey: getListProductsQueryKey() });
            toast({ title: "প্রোডাক্ট আপডেট হয়েছে", description: `"${nameEn}" সফলভাবে সেভ হয়েছে।` });
            setIsModalOpen(false);
          },
          onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : "অজানা সমস্যা হয়েছে।";
            toast({ title: "আপডেট ব্যর্থ হয়েছে", description: msg, variant: "destructive" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.refetchQueries({ queryKey: getListProductsQueryKey() });
            toast({ title: "প্রোডাক্ট তৈরি হয়েছে", description: `"${nameEn}" সফলভাবে যোগ হয়েছে।` });
            setIsModalOpen(false);
          },
          onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : "অজানা সমস্যা হয়েছে।";
            toast({ title: "তৈরি ব্যর্থ হয়েছে", description: msg, variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.refetchQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "প্রোডাক্ট মুছে ফেলা হয়েছে" });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "অজানা সমস্যা হয়েছে।";
          toast({ title: "মুছতে ব্যর্থ হয়েছে", description: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Products"
          description="Manage your store products."
          action={
            <Dialog open={isModalOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              setIsModalOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nameEn">Name (English) *</Label>
                      <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nameBn" className="font-bn">Name (Bangla) *</Label>
                      <Input id="nameBn" value={nameBn} onChange={(e) => setNameBn(e.target.value)} required className="font-bn" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priceBdt">Price (BDT) *</Label>
                      <Input id="priceBdt" value={priceBdt} onChange={(e) => setPriceBdt(e.target.value)} placeholder="e.g. 500" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceUsd">Price (USD) *</Label>
                      <Input id="priceUsd" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="e.g. 5.00" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Category</Label>
                      <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nameEn}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="badge">Badge</Label>
                      <Input id="badge" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. Popular, Hot" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descriptionEn">Description (English)</Label>
                    <Textarea id="descriptionEn" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={3} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descriptionBn" className="font-bn">Description (Bangla)</Label>
                    <Textarea id="descriptionBn" value={descriptionBn} onChange={(e) => setDescriptionBn(e.target.value)} rows={3} className="font-bn" />
                  </div>

                  <div className="flex items-center space-x-2 py-2">
                    <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                    <Label htmlFor="isActive">Active (visible to customers)</Label>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingProduct ? "Update Product" : "Create Product"}
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
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pl-4">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No products found. Create one!</TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors last:border-0">
                    <TableCell className="pl-4 py-3.5">
                      <div className="font-medium text-sm">{product.nameEn}</div>
                      <div className="text-xs text-muted-foreground font-bn">{product.nameBn}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-3.5">{product.categoryNameEn || "Uncategorized"}</TableCell>
                    <TableCell className="py-3.5">
                      <div className="font-semibold text-sm">৳{product.priceBdt}</div>
                      <div className="text-xs text-muted-foreground">${product.priceUsd}</div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      {product.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">Draft</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => handleOpenEdit(product)}>
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
                              <AlertDialogTitle>Delete product?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{product.nameEn}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
