
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, User, Languages, Key, Store, MoreHorizontal, PlusCircle, Package } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type ApiKey = { id: string; label: string; key: string; created: string };
type Outlet = { id: string; name: string; location: string };
type Promotion = { id: string; name: string; type: string; value: string; };
type Attribute = { id: string; name: string };


const initialApiKeys: ApiKey[] = [
    { id: "key_1", label: "Aplikasi POS Flutter", key: "sk_live_Abc123DeF4G5H6i7...", created: "29 Oktober 2023" },
];

const initialOutlets: Outlet[] = [
    { id: "out_1", name: "ScentPOS - Jakarta Pusat", location: "Jakarta" },
    { id: "out_2", name: "ScentPOS - Bandung", location: "Bandung" },
];

const initialPromotions: Promotion[] = [
    { id: "promo_1", name: "Diskon Akhir Pekan", type: "Persentase", value: "15%" },
    { id: "promo_2", name: "Beli 1 Gratis 1 Parfum Mini", type: "BOGO", value: "Parfum Mini" },
];

const initialCategories: Attribute[] = [
    { id: "cat_1", name: "Bibit Parfum" },
    { id: "cat_2", name: "Pelarut" },
    { id: "cat_3", name: "Bahan Sintetis" },
    { id: "cat_4", name: "Kemasan" },
]

const initialUnits: Attribute[] = [
    { id: "unit_1", name: "ml" },
    { id: "unit_2", name: "g" },
    { id: "unit_3", name: "pcs" },
]

export default function SettingsPage() {
    const { toast } = useToast();

    const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
    const [outlets, setOutlets] = useState<Outlet[]>(initialOutlets);
    const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);

    const [isKeyDialogOpen, setKeyDialogOpen] = useState(false);
    const [newKeyLabel, setNewKeyLabel] = useState("");

    const [isOutletDialogOpen, setOutletDialogOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

    const [isPromoDialogOpen, setPromoDialogOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

    const [categories, setCategories] = useState<Attribute[]>(initialCategories);
    const [units, setUnits] = useState<Attribute[]>(initialUnits);
    const [isAttrDialogOpen, setAttrDialogOpen] = useState(false);
    const [editingAttr, setEditingAttr] = useState<Attribute & {type: 'Kategori' | 'Unit'} | null>(null);

    const handleCreateKey = () => {
        if (!newKeyLabel) {
            toast({ variant: "destructive", title: "Error", description: "Label kunci API harus diisi." });
            return;
        }
        const newKey: ApiKey = {
            id: `key_${Date.now()}`,
            label: newKeyLabel,
            key: `sk_live_${btoa(Math.random().toString()).substring(10, 26)}...`,
            created: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
        };
        setApiKeys(prev => [...prev, newKey]);
        toast({ title: "Sukses", description: `Kunci API "${newKeyLabel}" berhasil dibuat.` });
        setNewKeyLabel("");
        setKeyDialogOpen(false);
    };

    const handleRevokeKey = (id: string) => {
        setApiKeys(apiKeys.filter(k => k.id !== id));
        toast({ title: "Sukses", description: "Kunci API telah dicabut." });
    };

    const handleOpenOutletDialog = (outlet: Outlet | null = null) => {
        setEditingOutlet(outlet ? { ...outlet } : { id: "", name: "", location: "" });
        setOutletDialogOpen(true);
    };

    const handleSaveOutlet = () => {
        if (!editingOutlet || !editingOutlet.name || !editingOutlet.location) {
            toast({ variant: "destructive", title: "Error", description: "Nama dan lokasi outlet harus diisi." });
            return;
        }
        if (editingOutlet.id) {
            setOutlets(outlets.map(o => o.id === editingOutlet.id ? editingOutlet : o));
            toast({ title: "Sukses", description: "Outlet berhasil diperbarui." });
        } else {
            const newOutlet = { ...editingOutlet, id: `out_${Date.now()}` };
            setOutlets(prev => [...prev, newOutlet]);
            toast({ title: "Sukses", description: "Outlet baru berhasil ditambahkan." });
        }
        setOutletDialogOpen(false);
        setEditingOutlet(null);
    };

    const handleDeleteOutlet = (id: string) => {
        setOutlets(outlets.filter(o => o.id !== id));
        toast({ title: "Sukses", description: "Outlet berhasil dihapus." });
    };

    const handleOpenPromoDialog = (promo: Promotion | null = null) => {
        setEditingPromo(promo ? { ...promo } : { id: "", name: "", type: "Persentase", value: "" });
        setPromoDialogOpen(true);
    };

    const handleSavePromo = () => {
        if (!editingPromo || !editingPromo.name || !editingPromo.value) {
            toast({ variant: "destructive", title: "Error", description: "Semua field promosi harus diisi." });
            return;
        }
        if (editingPromo.id) {
            setPromotions(promotions.map(p => p.id === editingPromo.id ? editingPromo : p));
            toast({ title: "Sukses", description: "Promosi berhasil diperbarui." });
        } else {
            const newPromo = { ...editingPromo, id: `promo_${Date.now()}` };
            setPromotions(prev => [...prev, newPromo]);
            toast({ title: "Sukses", description: "Promosi baru berhasil ditambahkan." });
        }
        setPromoDialogOpen(false);
        setEditingPromo(null);
    };

    const handleDeletePromo = (id: string) => {
        setPromotions(promotions.filter(p => p.id !== id));
        toast({ title: "Sukses", description: "Promosi berhasil dihapus." });
    };

    const handleOpenAttrDialog = (attr: Attribute | null, type: 'Kategori' | 'Unit') => {
        setEditingAttr(attr ? { ...attr, type } : { id: "", name: "", type });
        setAttrDialogOpen(true);
    };

    const handleSaveAttr = () => {
        if (!editingAttr || !editingAttr.name) {
            toast({ variant: "destructive", title: "Error", description: "Nama atribut harus diisi." });
            return;
        }
        
        const list = editingAttr.type === 'Kategori' ? categories : units;
        const setList = editingAttr.type === 'Kategori' ? setCategories : setUnits;
        const prefix = editingAttr.type === 'Kategori' ? 'cat' : 'unit';

        if (editingAttr.id) {
            setList(list.map(item => item.id === editingAttr.id ? {id: item.id, name: editingAttr.name} : item));
        } else {
            const newItem = { id: `${prefix}_${Date.now()}`, name: editingAttr.name };
            setList(prev => [...prev, newItem]);
        }
        toast({ title: "Sukses", description: `${editingAttr.type} berhasil disimpan.` });
        setAttrDialogOpen(false);
        setEditingAttr(null);
    };

     const handleDeleteAttr = (id: string, type: 'Kategori' | 'Unit') => {
        const setList = type === 'Kategori' ? setCategories : setUnits;
        setList(prev => prev.filter(item => item.id !== id));
        toast({ title: "Sukses", description: `${type} berhasil dihapus.` });
    };


    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold">Pengaturan</h1>
            <div className="grid gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Atribut Inventaris</CardTitle>
                        <CardDescription>Kelola atribut yang digunakan untuk item inventaris, seperti kategori dan unit pengukuran.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="categories">
                            <TabsList>
                                <TabsTrigger value="categories">Kategori</TabsTrigger>
                                <TabsTrigger value="units">Unit</TabsTrigger>
                            </TabsList>
                            <Dialog open={isAttrDialogOpen} onOpenChange={setAttrDialogOpen}>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">
                                        {editingAttr?.id ? `Ubah ${editingAttr?.type}` : `Tambah ${editingAttr?.type} Baru`}
                                    </DialogTitle></DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="attr-name" className="text-right">Nama</Label>
                                            <Input id="attr-name" value={editingAttr?.name || ''} onChange={e => setEditingAttr(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter><Button onClick={handleSaveAttr}>Simpan</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <TabsContent value="categories">
                                <div className="flex justify-end mb-4">
                                    <Button onClick={() => handleOpenAttrDialog(null, 'Kategori')}><PlusCircle className="mr-2" /> Tambah Kategori</Button>
                                </div>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nama Kategori</TableHead><TableHead className="w-[100px] text-right">Aksi</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {categories.map(cat => (
                                            <TableRow key={cat.id}>
                                                <TableCell>{cat.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenAttrDialog(cat, 'Kategori')}>Ubah</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAttr(cat.id, 'Kategori')}>Hapus</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                            <TabsContent value="units">
                                <div className="flex justify-end mb-4">
                                     <Button onClick={() => handleOpenAttrDialog(null, 'Unit')}><PlusCircle className="mr-2" /> Tambah Unit</Button>
                                </div>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nama Unit</TableHead><TableHead className="w-[100px] text-right">Aksi</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {units.map(unit => (
                                            <TableRow key={unit.id}>
                                                <TableCell>{unit.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenAttrDialog(unit, 'Unit')}>Ubah</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAttr(unit.id, 'Unit')}>Hapus</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Manajemen Kunci API</CardTitle>
                        <CardDescription>Buat dan kelola kunci API untuk aplikasi eksternal seperti POS Flutter Anda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="flex justify-end">
                            <Dialog open={isKeyDialogOpen} onOpenChange={setKeyDialogOpen}>
                                <DialogTrigger asChild><Button>Buat Kunci Baru</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">Buat Kunci API Baru</DialogTitle></DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <Label htmlFor="key-label">Label</Label>
                                        <Input id="key-label" value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="e.g., Aplikasi POS Flutter" />
                                        <DialogDescription>Beri nama kunci ini agar Anda dapat mengingatnya nanti.</DialogDescription>
                                    </div>
                                    <DialogFooter><Button onClick={handleCreateKey}>Buat & Salin Kunci</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                         </div>
                         <Separator className="my-4" />
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Label</TableHead>
                                     <TableHead>Kunci (Potongan)</TableHead>
                                     <TableHead>Dibuat</TableHead>
                                     <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 {apiKeys.map(key => (
                                     <TableRow key={key.id}>
                                         <TableCell className="font-medium">{key.label}</TableCell>
                                         <TableCell className="font-mono">{key.key}</TableCell>
                                         <TableCell>{key.created}</TableCell>
                                         <TableCell className="text-right">
                                             <Button variant="destructive" size="sm" onClick={() => handleRevokeKey(key.id)}>Cabut</Button>
                                         </TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Manajemen Outlet</CardTitle>
                        <CardDescription>Kelola semua lokasi atau cabang bisnis Anda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="flex justify-end">
                             <Dialog open={isOutletDialogOpen} onOpenChange={setOutletDialogOpen}>
                                <DialogTrigger asChild><Button onClick={() => handleOpenOutletDialog()}><PlusCircle className="mr-2" /> Tambah Outlet Baru</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">{editingOutlet?.id ? 'Ubah Outlet' : 'Tambah Outlet Baru'}</DialogTitle></DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="outlet-name" className="text-right">Nama</Label>
                                            <Input id="outlet-name" value={editingOutlet?.name || ''} onChange={e => setEditingOutlet(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="outlet-location" className="text-right">Lokasi</Label>
                                            <Input id="outlet-location" value={editingOutlet?.location || ''} onChange={e => setEditingOutlet(prev => prev ? {...prev, location: e.target.value} : null)} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter><Button onClick={handleSaveOutlet}>Simpan</Button></DialogFooter>
                                </DialogContent>
                             </Dialog>
                         </div>
                         <Separator className="my-4" />
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Nama Outlet</TableHead>
                                     <TableHead>Lokasi</TableHead>
                                     <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 {outlets.map(outlet => (
                                     <TableRow key={outlet.id}>
                                         <TableCell className="font-medium">{outlet.name}</TableCell>
                                         <TableCell>{outlet.location}</TableCell>
                                         <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Buka menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenOutletDialog(outlet)}>Ubah</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteOutlet(outlet.id)}>Hapus</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                         </TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Promosi</CardTitle>
                        <CardDescription>Kelola diskon dan penawaran khusus seperti 'Beli Satu Gratis Satu' atau harga grosir.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-end">
                            <Dialog open={isPromoDialogOpen} onOpenChange={setPromoDialogOpen}>
                                <DialogTrigger asChild><Button onClick={() => handleOpenPromoDialog()}><PlusCircle className="mr-2" /> Buat Promosi Baru</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">{editingPromo?.id ? 'Ubah Promosi' : 'Buat Promosi Baru'}</DialogTitle></DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="promo-name" className="text-right">Nama</Label>
                                            <Input id="promo-name" value={editingPromo?.name || ''} onChange={e => setEditingPromo(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3" placeholder="e.g., Diskon Akhir Tahun" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="promo-type" className="text-right">Jenis</Label>
                                            <Select value={editingPromo?.type} onValueChange={(value) => setEditingPromo(prev => prev ? {...prev, type: value} : null)}>
                                                <SelectTrigger id="promo-type" className="col-span-3">
                                                    <SelectValue placeholder="Pilih jenis promosi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Persentase">Persentase (%)</SelectItem>
                                                    <SelectItem value="Nominal">Nominal (Rp)</SelectItem>
                                                    <SelectItem value="BOGO">BOGO (Beli X Gratis Y)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="promo-value" className="text-right">Nilai</Label>
                                            <Input id="promo-value" value={editingPromo?.value || ''} onChange={e => setEditingPromo(prev => prev ? {...prev, value: e.target.value} : null)} className="col-span-3" placeholder="e.g., 15% atau 50000" />
                                        </div>
                                    </div>
                                    <DialogFooter><Button onClick={handleSavePromo}>Simpan Promosi</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Separator className="my-4" />
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Promosi</TableHead>
                                    <TableHead>Jenis</TableHead>
                                    <TableHead>Nilai</TableHead>
                                    <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promotions.map(promo => (
                                    <TableRow key={promo.id}>
                                        <TableCell className="font-medium">{promo.name}</TableCell>
                                        <TableCell>{promo.type}</TableCell>
                                        <TableCell>{promo.value}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Buka menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenPromoDialog(promo)}>Ubah</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeletePromo(promo.id)}>Hapus</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Manajemen Pengguna</CardTitle>
                        <CardDescription>Kelola akun staf dan peran mereka (Kasir, Admin, Pemilik).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                         <Button>Tambah Pengguna Baru</Button>
                         <Button variant="outline" asChild>
                            <Link href="/dashboard/settings/roles">Kelola Peran</Link>
                         </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5" /> Bahasa & Wilayah</CardTitle>
                        <CardDescription>Atur bahasa aplikasi dan mata uang.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="language">Bahasa</Label>
                            <Select defaultValue="id">
                                <SelectTrigger id="language">
                                    <SelectValue placeholder="Pilih bahasa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="id">Indonesia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
