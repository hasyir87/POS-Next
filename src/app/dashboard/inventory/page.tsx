
"use client";

import { useState } from "react";
import { InventoryTool } from "@/components/inventory-tool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Material = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

const initialAvailableMaterials: Material[] = [
  { id: "MAT001", name: "Rose Absolute", quantity: 500, unit: "ml", category: "Bibit Parfum" },
  { id: "MAT002", name: "Jasmine Sambac", quantity: 350, unit: "ml", category: "Bibit Parfum" },
  { id: "MAT003", name: "Bergamot Oil", quantity: 1200, unit: "ml", category: "Bibit Parfum" },
  { id: "MAT004", name: "Sandalwood", quantity: 200, unit: "g", category: "Bibit Parfum" },
  { id: "MAT005", name: "Vanilla Extract", quantity: 800, unit: "ml", category: "Bibit Parfum" },
  { id: "MAT006", name: "Ethanol (Perfumer's Alcohol)", quantity: 5000, unit: "ml", category: "Pelarut" },
  { id: "MAT007", name: "Iso E Super", quantity: 2500, unit: "ml", category: "Bahan Sintetis" },
  { id: "MAT008", name: "Ambroxan", quantity: 150, unit: "g", category: "Bahan Sintetis" },
  { id: "MAT009", name: "Botol Kaca 50ml", quantity: 150, unit: "pcs", category: "Kemasan" },
  { id: "MAT010", name: "Botol Kaca 100ml", quantity: 80, unit: "pcs", category: "Kemasan" },
];

export default function InventoryPage() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>(initialAvailableMaterials);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const emptyMaterial: Material = { id: "", name: "", quantity: 0, unit: "", category: "" };

  const handleOpenDialog = (material: Material | null = null) => {
    setEditingMaterial(material ? { ...material } : emptyMaterial);
    setDialogOpen(true);
  };

  const handleSaveMaterial = () => {
    if (!editingMaterial || !editingMaterial.name || !editingMaterial.unit || !editingMaterial.category) {
      toast({ variant: "destructive", title: "Error", description: "Nama, unit, dan kategori bahan harus diisi." });
      return;
    }

    if (editingMaterial.id) {
      setMaterials(materials.map(mat => mat.id === editingMaterial.id ? editingMaterial : mat));
      toast({ title: "Sukses", description: "Bahan berhasil diperbarui." });
    } else {
      const newMaterial = { ...editingMaterial, id: `MAT${(materials.length + 1).toString().padStart(3, '0')}` };
      setMaterials(prev => [...prev, newMaterial]);
      toast({ title: "Sukses", description: "Bahan baru berhasil ditambahkan." });
    }
    setDialogOpen(false);
    setEditingMaterial(null);
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials(materials.filter(mat => mat.id !== id));
    toast({ title: "Sukses", description: "Bahan berhasil dihapus." });
  };
  
  const groupedMaterials = materials.reduce((acc, material) => {
    const { category } = material;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(material);
    return acc;
  }, {} as Record<string, Material[]>);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold">Inventaris</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Inventaris Langsung</CardTitle>
                      <CardDescription>Tingkat stok bahan baku saat ini dikelompokkan berdasarkan kategori.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => handleOpenDialog()}><PlusCircle className="mr-2" /> Tambah Bahan</Button>
                      </DialogTrigger>
                       <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingMaterial?.id ? 'Ubah Bahan' : 'Tambah Bahan Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nama</Label>
                                <Input id="name" className="col-span-3" value={editingMaterial?.name || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, name: e.target.value} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Kategori</Label>
                                <Input id="category" className="col-span-3" value={editingMaterial?.category || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, category: e.target.value} : null)} placeholder="e.g., Bibit Parfum, Kemasan"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">Kuantitas</Label>
                                <Input id="quantity" type="number" className="col-span-3" value={editingMaterial?.quantity || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, quantity: parseFloat(e.target.value) || 0} : null)} />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit" className="text-right">Unit</Label>
                                <Input id="unit" className="col-span-3" value={editingMaterial?.unit || ''} onChange={(e) => setEditingMaterial(prev => prev ? {...prev, unit: e.target.value} : null)} placeholder="e.g., ml, g, pcs" />
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
                                      <TableHead className="text-right">Kuantitas</TableHead>
                                      <TableHead className="w-[50px]"></TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {items.map((material) => (
                                      <TableRow key={material.id}>
                                          <TableCell>{material.name}</TableCell>
                                          <TableCell className="text-right">{material.quantity} {material.unit}</TableCell>
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
                                  ))}
                              </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-4">
          <InventoryTool availableMaterials={materials} />
        </div>
      </div>
    </div>
  );
}
