"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreHorizontal, SprayCan, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import type { Database } from "@/types/database";

type Product = Database['public']['Tables']['products']['Row'];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ProductsPage() {
    const { toast } = useToast();
    const { selectedOrganizationId, loading: authLoading, supabase } = useAuth();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

    const emptyProduct: Partial<Product> = { name: "", price: 0, stock: 0, image_url: "https://placehold.co/150x150.png" };
    
    const fetchProducts = useCallback(async () => {
        if (!selectedOrganizationId || !supabase) return;

        setIsLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('organization_id', selectedOrganizationId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching products:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data produk." });
            setProducts([]);
        } else {
            setProducts(data as Product[]);
        }
        setIsLoading(false);
    }, [selectedOrganizationId, supabase, toast]);

    useEffect(() => {
        if (!authLoading && selectedOrganizationId) {
            fetchProducts();
        } else if (!selectedOrganizationId && !authLoading) {
            setIsLoading(false);
            setProducts([]);
        }
    }, [selectedOrganizationId, authLoading, fetchProducts]);

    const handleOpenDialog = (product: Partial<Product> | null = null) => {
        setEditingProduct(product ? { ...product } : emptyProduct);
        setDialogOpen(true);
    };

    const handleSaveProduct = async () => {
        if (!editingProduct || !editingProduct.name || !editingProduct.price) {
            toast({ variant: "destructive", title: "Error", description: "Nama dan harga produk harus diisi." });
            return;
        }
        if (!selectedOrganizationId || !supabase) {
            toast({ variant: "destructive", title: "Error", description: "Organisasi tidak terpilih atau koneksi DB gagal." });
            return;
        }

        const productData = {
            name: editingProduct.name,
            price: editingProduct.price,
            stock: editingProduct.stock || 0,
            image_url: editingProduct.image_url,
            organization_id: selectedOrganizationId,
            description: editingProduct.description
        };

        let error;

        if (editingProduct.id) {
            ({ error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', editingProduct.id));
        } else {
            ({ error } = await supabase
                .from('products')
                .insert([productData as Product]));
        }

        if (error) {
            toast({ variant: "destructive", title: "Error", description: `Gagal menyimpan produk: ${error.message}` });
        } else {
            toast({ title: "Sukses", description: `Produk berhasil ${editingProduct.id ? 'diperbarui' : 'ditambahkan'}.` });
        }
        
        setDialogOpen(false);
        setEditingProduct(null);
        await fetchProducts();
    };
    
    const handleDeleteProduct = async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            toast({ variant: "destructive", title: "Error", description: `Gagal menghapus produk: ${error.message}` });
        } else {
            toast({ title: "Sukses", description: "Produk berhasil dihapus." });
            await fetchProducts();
        }
    };

    if (authLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold flex items-center gap-2"><SprayCan className="h-8 w-8" /> Manajemen Produk Jadi</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()} disabled={!selectedOrganizationId}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Produk Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingProduct?.id ? 'Ubah Produk' : 'Tambah Produk Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nama</Label>
                                <Input id="name" placeholder="Nama produk" className="col-span-3" value={editingProduct?.name || ''} onChange={(e) => setEditingProduct(prev => prev ? {...prev, name: e.target.value} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Harga Jual</Label>
                                <Input id="price" type="number" placeholder="Rp 0" className="col-span-3" value={editingProduct?.price || ''} onChange={(e) => setEditingProduct(prev => prev ? {...prev, price: parseFloat(e.target.value) || 0} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock" className="text-right">Stok</Label>
                                <Input id="stock" type="number" placeholder="0" className="col-span-3" value={editingProduct?.stock || ''} onChange={(e) => setEditingProduct(prev => prev ? {...prev, stock: parseInt(e.target.value) || 0} : null)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveProduct} type="submit">Simpan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Produk Jadi</CardTitle>
                    <CardDescription>Kelola produk parfum yang siap dijual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Gambar</TableHead>
                                <TableHead>Nama Produk</TableHead>
                                <TableHead>Stok</TableHead>
                                <TableHead className="text-right">Harga Jual</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell>
                                </TableRow>
                            ) : !selectedOrganizationId ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">Pilih outlet untuk melihat data produk.</TableCell>
                                </TableRow>
                            ) : products.length > 0 ? (
                                products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <Image src={product.image_url || "https://placehold.co/50x50.png"} alt={product.name} width={50} height={50} className="rounded-md aspect-square object-cover" data-ai-hint="perfume bottle" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-muted-foreground">{product.id}</div>
                                        </TableCell>
                                        <TableCell>{product.stock} pcs</TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                                        <TableCell>
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Buka menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(product)}>Ubah</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteProduct(product.id)}>Hapus</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">Tidak ada produk untuk outlet ini.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
