
"use client";

import { useState } from "react";
import { InventoryTool } from "@/components/inventory-tool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, PlusCircle, PackageSearch } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Material = {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  unit: string;
  category: string;
  purchasePrice: number;
};

const initialAvailableMaterials: Material[] = [
  { id: "MAT001", name: "Rose Absolute", brand: "Luxe Fragrance Co.", quantity: 50, unit: "ml", category: "Bibit Parfum", purchasePrice: 1500 },
  { id: "MAT002", name: "Jasmine Sambac", brand: "Aroma Natural", quantity: 350, unit: "ml", category: "Bibit Parfum", purchasePrice: 1800 },
  { id: "MAT003", name: "Bergamot Oil", brand: "Aroma Natural", quantity: 1200, unit: "ml", category: "Bibit Parfum", purchasePrice: 800 },
  { id: "MAT004", name: "Sandalwood", brand: "Luxe Fragrance Co.", quantity: 0, unit: "g", category: "Bibit Parfum", purchasePrice: 2500 },
  { id: "MAT005", name: "Vanilla Extract", brand: "Aroma Natural", quantity: 800, unit: "ml", category: "Bibit Parfum", purchasePrice: 950 },
  { id: "MAT006", name: "Ethanol (Perfumer's Alcohol)", brand: "Generic Chemical", quantity: 5000, unit: "ml", category: "Pelarut", purchasePrice: 100 },
  { id: "MAT007", name: "Iso E Super", brand: "SynthScents", quantity: 180, unit: "ml", category: "Bahan Sintetis", purchasePrice: 400 },
  { id: "MAT008", name: "Ambroxan", brand: "SynthScents", quantity: 150, unit: "g", category: "Bahan Sintetis", purchasePrice: 3000 },
  { id: "MAT009", name: "Botol Kaca 50ml", brand: "GlassPack", quantity: 150, unit: "pcs", category: "Kemasan", purchasePrice: 3500 },
  { id: "MAT010", name: "Botol Kaca 100ml", brand: "GlassPack", quantity: 80, unit: "pcs", category: "Kemasan", purchasePrice: 5000 },
];

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
  const [materials, setMaterials] = useState<Material[]>(initialAvailableMaterials);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // In a real app, these would come from the settings page or a global state management solution
  const [categories, setCategories] = useState(initialCategories);
  const [units, setUnits] = useState(initialUnits);
  const [brands, setBrands] = useState(initialBrands);
  const [lowStockThreshold, setLowStockThreshold] = useState(200);

  const emptyMaterial: Material = { id: "", name: "", brand: "", quantity: 0, unit: "", category: "", purchasePrice: 0 };

  const handleOpenDialog = (material: Material | null = null) => {
    setEditingMaterial(material ? { ...material } : emptyMaterial);
    setDialogOpen(true);
  };

  const handleSaveMaterial = () => {
    if (!editingMaterial || !editingMaterial.name || !editingMaterial.unit || !editingMaterial.category || !editingMaterial.brand) {
      toast({ variant: "destructive", title: "Error", description: "Nama, brand, unit, dan kategori bahan harus diisi." });
      return;
    }

    if (editingMaterial.id) {
      setMaterials(prev => prev.map(mat => mat.id === editingMaterial.id ? editingMaterial : mat));
      toast({ title: "Sukses", description: "Bahan berhasil diperbarui." });
    } else {
      const newMaterial = { ...editingMaterial, id: `MAT${(materials.length + 1).toString().padStart(3, '0')}` };
      setMaterials(prev => [newMaterial, ...prev]);
      toast({ title: "Sukses", description: "Bahan baru berhasil ditambahkan." });
    }
    setDialogOpen(false);
    setEditingMaterial(null);
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(mat => mat.id !== id));
    toast({ title: "Sukses", description: "Bahan berhasil dihapus." });
  };
  
  const groupedMaterials = materials.reduce((acc, material) => {
    const categoryLabel = categories.find(c => c.value === material.category)?.label || material.category;
    if (!acc[categoryLabel]) {
      acc[categoryLabel] = [];
    }
    acc[categoryLabel].push(material);
    return acc;
  }, {} as Record<string, Material[]>);


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
                        <Button size="sm" onClick={() => handleOpenDialog()}><PlusCircle className="mr-2" /> Tambah Bahan</Button>
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
                                <Select value={editingMaterial?.brand} onValueChange={(value) => setEditingMaterial(prev => prev ? {...prev, brand: value} : null)}>
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
                                 <Select value={editingMaterial?.category} onValueChange={(value) => setEditingMaterial(prev => prev ? {...prev, category: value} : null)}>
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
                                <Select value={editingMaterial?.unit} onValueChange={(value) => setEditingMaterial(prev => prev ? {...prev, unit: value} : null)}>
                                    <SelectTrigger id="unit" className="col-span-3">
                                        <SelectValue placeholder="Pilih unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map(unit => (<SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="purchasePrice" className="text-right">Harga Beli</Label>
                                <Input id="purchasePrice" type="number" placeholder="Rp 0" className="col-span-3" value={editingMaterial?.purchasePrice || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, purchasePrice: parseFloat(e.target.value) || 0} : null)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveMaterial} type="submit">Simpan</Button>
                        </DialogFooter>
                    </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedMaterials)}>
                    {Object.entries(groupedMaterials).map(([category, items]) => (
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
                                            <TableCell>{formatCurrency(material.purchasePrice)}</TableCell>
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
                                            <TableCell className="text-right font-semibold">{formatCurrency(material.quantity * material.purchasePrice)}</TableCell>
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
                    ))}
                  </Accordion>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-3">
          <InventoryTool availableMaterials={materials} />
        </div>
      </div>
    </div>
  );
}

    