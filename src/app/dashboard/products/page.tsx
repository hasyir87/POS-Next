
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreHorizontal, SprayCan } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

type Product = {
    id: string;
    name: string;
    cogs: number; // Cost of Goods Sold / Harga Pokok Penjualan (HPP)
    price: number;
    stock: number;
    image: string;
    "data-ai-hint": string;
};

const initialProductCatalog: Product[] = [
  { id: "PROD001", name: "Ocean Breeze", cogs: 32000, price: 79990, image: "https://placehold.co/150x150.png", stock: 15, "data-ai-hint": "perfume bottle" },
  { id: "PROD002", name: "Mystic Woods", cogs: 35000, price: 85000, image: "https://placehold.co/150x150.png", stock: 10, "data-ai-hint": "perfume bottle" },
  { id: "PROD003", name: "Citrus Grove", cogs: 30000, price: 75500, image: "https://placehold.co/150x150.png", stock: 20, "data-ai-hint": "perfume bottle" },
  { id: "PROD004", name: "Floral Fantasy", cogs: 40000, price: 92000, image: "https://placehold.co/150x150.png", stock: 8, "data-ai-hint": "perfume bottle" },
];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};


export default function ProductsPage() {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>(initialProductCatalog);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const emptyProduct: Product = { id: "", name: "", price: 0, cogs: 0, stock: 0, image: "https://placehold.co/150x150.png", "data-ai-hint": "perfume bottle" };

    const handleOpenDialog = (product: Product | null = null) => {
        setEditingProduct(product ? { ...product } : emptyProduct);
        setDialogOpen(true);
    };

    const handleSaveProduct = () => {
        if (!editingProduct || !editingProduct.name || !editingProduct.price) {
            toast({ variant: "destructive", title: "Error", description: "Nama dan harga produk harus diisi." });
            return;
        }

        if (editingProduct.id) {
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
            toast({ title: "Sukses", description: "Produk berhasil diperbarui." });
        } else {
            const newProduct = { ...editingProduct, id: `PROD${(products.length + 1).toString().padStart(3, '0')}` };
            setProducts(prev => [newProduct, ...prev]);
            toast({ title: "Sukses", description: "Produk baru berhasil ditambahkan." });
        }
        setDialogOpen(false);
        setEditingProduct(null);
    };
    
    const handleDeleteProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
        toast({ title: "Sukses", description: "Produk berhasil dihapus." });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold flex items-center gap-2"><SprayCan className="h-8 w-8" /> Manajemen Produk Jadi</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
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
                                <Label htmlFor="cogs" className="text-right">HPP</Label>
                                <Input id="cogs" type="number" placeholder="Rp 0" className="col-span-3" value={editingProduct?.cogs || ''} onChange={(e) => setEditingProduct(prev => prev ? {...prev, cogs: parseFloat(e.target.value) || 0} : null)} />
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
                    <CardDescription>Kelola produk parfum yang siap dijual. Harga untuk layanan isi ulang diatur di halaman POS.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Gambar</TableHead>
                                <TableHead>Nama Produk</TableHead>
                                <TableHead>Stok</TableHead>
                                <TableHead className="text-right">HPP</TableHead>
                                <TableHead className="text-right">Harga Jual</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <Image src={product.image} alt={product.name} width={50} height={50} className="rounded-md aspect-square object-cover" data-ai-hint={product['data-ai-hint']} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-muted-foreground">{product.id}</div>
                                    </TableCell>
                                    <TableCell>{product.stock} pcs</TableCell>
                                    <TableCell className="text-right">{formatCurrency(product.cogs)}</TableCell>
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

    