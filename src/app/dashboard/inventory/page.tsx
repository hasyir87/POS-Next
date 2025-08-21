
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { InventoryTool } from "@/components/inventory-tool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, PlusCircle, PackageSearch, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Database } from '@/types/database';
import { getFirestore, collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';

type RawMaterial = Database['public']['Tables']['raw_materials']['Row'];

const initialCategories = [
    { value: "Bibit Parfum", label: "Bibit Parfum" },
    { value: "Pelarut", label: "Pelarut" },
    { value: "Bahan Sintetis", label: "Bahan Sintetis" },
    { value: "Kemasan", label: "Kemasan" },
]

const initialUnits = [
    { value: "ml", label: "ml" },
    { value: "g", label: "g" },
    { value: "pcs", label: "pcs" },
]

const initialBrands = [
    { value: "Luxe Fragrance Co.", label: "Luxe Fragrance Co." },
    { value: "Aroma Natural", label: "Aroma Natural" },
    { value: "Generic Chemical", label: "Generic Chemical" },
    { value: "SynthScents", label: "SynthScents" },
    { value: "GlassPack", label: "GlassPack" },
]

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};


export default function InventoryPage() {
  const { toast } = useToast();
  const { selectedOrganizationId, loading: authLoading } = useAuth();
  const db = getFirestore(firebaseApp);

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<RawMaterial> | null>(null);

  const [categories, setCategories] = useState(initialCategories);
  const [units, setUnits] = useState(initialUnits);
  const [brands, setBrands] = useState(initialBrands);
  const [lowStockThreshold, setLowStockThreshold] = useState(200);

  const emptyMaterial: Partial<RawMaterial> = { name: "", brand: "", quantity: 0, unit: "", category: "", purchase_price: 0 };

  const fetchMaterials = useCallback(async () => {
    if (!selectedOrganizationId) {
        setMaterials([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
        const q = query(collection(db, "raw_materials"), where("organization_id", "==", selectedOrganizationId));
        const querySnapshot = await getDocs(q);
        const materialsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RawMaterial));
        setMaterials(materialsData);
    } catch (error) {
        console.error("Error fetching materials:", error);
        toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data inventaris." });
        setMaterials([]);
    } finally {
        setIsLoading(false);
    }
}, [selectedOrganizationId, db, toast]);


  useEffect(() => {
    if(!authLoading && selectedOrganizationId) {
      fetchMaterials();
    } else if (!selectedOrganizationId && !authLoading) {
      setIsLoading(false);
      setMaterials([]);
    }
  }, [selectedOrganizationId, authLoading, fetchMaterials]);

  const handleOpenDialog = (material: Partial<RawMaterial> | null = null) => {
    setEditingMaterial(material ? { ...material } : emptyMaterial);
    setDialogOpen(true);
  };

  const handleSaveMaterial = async () => {
    if (!editingMaterial || !editingMaterial.name || !editingMaterial.unit || !editingMaterial.category || !editingMaterial.brand) {
      toast({ variant: "destructive", title: "Error", description: "Nama, brand, unit, dan kategori bahan harus diisi." });
      return;
    }
    if (!selectedOrganizationId) {
        toast({ variant: "destructive", title: "Error", description: "Organisasi tidak terpilih." });
        return;
    }
    
    const materialData = {
        name: editingMaterial.name,
        brand: editingMaterial.brand,
        quantity: editingMaterial.quantity,
        unit: editingMaterial.unit,
        category: editingMaterial.category,
        purchase_price: editingMaterial.purchase_price,
        organization_id: selectedOrganizationId,
    };

    try {
        if (editingMaterial.id) {
            const materialRef = doc(db, 'raw_materials', editingMaterial.id);
            await updateDoc(materialRef, materialData);
        } else {
            await addDoc(collection(db, 'raw_materials'), materialData);
        }
        toast({ title: "Sukses", description: "Bahan berhasil disimpan." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: `Gagal menyimpan bahan: ${error.message}` });
    }
    
    setDialogOpen(false);
    setEditingMaterial(null);
    await fetchMaterials();
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'raw_materials', id));
        toast({ title: "Sukses", description: "Bahan berhasil dihapus." });
        await fetchMaterials();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: `Gagal menghapus bahan: ${error.message}` });
    }
  };
  
  const groupedMaterials = materials.reduce((acc, material) => {
    const categoryLabel = material.category || 'Lainnya';
    if (!acc[categoryLabel]) {
      acc[categoryLabel] = [];
    }
    acc[categoryLabel].push(material);
    return acc;
  }, {} as Record<string, RawMaterial[]>);

  if (authLoading) {
    return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold flex items-center gap-2"><PackageSearch className="h-8 w-8"/>Inventaris</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Stok Bahan</CardTitle>
                      <CardDescription>Tingkat stok bahan baku saat ini dikelompokkan berdasarkan kategori.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => handleOpenDialog()} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Bahan</Button>
                      </DialogTrigger>
                       <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingMaterial?.id ? 'Ubah Bahan' : 'Tambah Bahan Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nama</Label>
                                <Input id="name" className="col-span-3" value={editingMaterial?.name || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, name: e.target.value} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="brand" className="text-right">Brand</Label>
                                <Select value={editingMaterial?.brand || ''} onValueChange={(value) => setEditingMaterial(prev => prev ? {...prev, brand: value} : null)}>
                                    <SelectTrigger id="brand" className="col-span-3">
                                        <SelectValue placeholder="Pilih brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map(brand => (<SelectItem key={brand.value} value={brand.value}>{brand.label}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Kategori</Label>
                                 <Select value={editingMaterial?.category || ''} onValueChange={(value) => setEditingMaterial(prev => prev ? {...prev, category: value} : null)}>
                                    <SelectTrigger id="category" className="col-span-3">
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">Kuantitas</Label>
                                <Input id="quantity" type="number" className="col-span-3" value={editingMaterial?.quantity || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, quantity: parseFloat(e.target.value) || 0} : null)} />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit" className="text-right">Unit</Label>
                                <Select value={editingMaterial?.unit || ''} onValueChange={(value) => setEditingMaterial(prev => prev ? {...prev, unit: value} : null)}>
                                    <SelectTrigger id="unit" className="col-span-3">
                                        <SelectValue placeholder="Pilih unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map(unit => (<SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="purchase_price" className="text-right">Harga Beli</Label>
                                <Input id="purchase_price" type="number" placeholder="Rp 0" className="col-span-3" value={editingMaterial?.purchase_price || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, purchase_price: parseFloat(e.target.value) || 0} : null)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveMaterial} type="submit">Simpan</Button>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                     <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
                  ) : !selectedOrganizationId ? (
                    <p className="text-center text-gray-500 py-4">Pilih outlet untuk melihat data inventaris.</p>
                  ) : (
                    <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedMaterials)}>
                      {Object.keys(groupedMaterials).length > 0 ? Object.entries(groupedMaterials).map(([category, items]) => (
                        <AccordionItem value={category} key={category}>
                          <AccordionTrigger className="text-base font-medium">{category}</AccordionTrigger>
                          <AccordionContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bahan</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Harga Beli</TableHead>
                                        <TableHead className="text-right">Kuantitas</TableHead>
                                        <TableHead className="text-right">Nilai Stok</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((material) => {
                                        const isLowStock = material.quantity > 0 && material.quantity < lowStockThreshold;
                                        const isOutOfStock = material.quantity === 0;
                                        return (
                                          <TableRow key={material.id}>
                                              <TableCell className="font-medium">{material.name}</TableCell>
                                              <TableCell>{material.brand}</TableCell>
                                              <TableCell>{formatCurrency(material.purchase_price)}</TableCell>
                                              <TableCell className="text-right">
                                                  <div className="flex items-center justify-end gap-2">
                                                       {(isLowStock || isOutOfStock) && (
                                                          <span className={cn("h-2 w-2 rounded-full", {
                                                              "bg-yellow-500": isLowStock,
                                                              "bg-red-500": isOutOfStock,
                                                          })} title={isOutOfStock ? "Stok Habis" : "Stok Menipis"}></span>
                                                       )}
                                                      {material.quantity.toLocaleString('id-ID')} {material.unit}
                                                  </div>
                                              </TableCell>
                                              <TableCell className="text-right font-semibold">{formatCurrency(material.quantity * material.purchase_price)}</TableCell>
                                              <TableCell>
                                                <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                          <Button variant="ghost" className="h-8 w-8 p-0">
                                                              <span className="sr-only">Buka menu</span>
                                                              <MoreHorizontal className="h-4 w-4" />
                                                          </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                          <DropdownMenuItem onClick={() => handleOpenDialog(material)}>Ubah</DropdownMenuItem>
                                                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMaterial(material.id)}>Hapus</DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                  </DropdownMenu>
                                              </TableCell>
                                          </TableRow>
                                      )})}
                                </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      )) : <p className="text-center text-gray-500 py-4">Tidak ada data inventaris untuk outlet ini.</p>}
                    </Accordion>
                  )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-3">
          <InventoryTool availableMaterials={materials.map(m => ({ name: m.name, quantity: m.quantity, unit: m.unit}))} />
        </div>
      </div>
    </div>
  );
}
