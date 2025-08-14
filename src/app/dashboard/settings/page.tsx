
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, User, Languages, Key, Store, MoreHorizontal, PlusCircle, Package, Bell, Star, Loader2 } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import type { Grade } from '@/types/database';


// SIMULASI DATA - Di aplikasi nyata, ini akan berasal dari database
const productCatalogForSettings = [
  { id: "PROD001", name: "Ocean Breeze" },
  { id: "PROD002", name: "Mystic Woods" },
  { id: "PROD003", name: "Citrus Grove" },
  { id: "PROD004", name: "Floral Fantasy" },
  { id: "PROD005", name: "Parfum Mini" },
];


type ApiKey = { id: string; label: string; key: string; created: string };
type Outlet = { id: string; name: string; location: string };
type Promotion = { id: string; name: string; type: string; value: string; };
type Attribute = { id: string; name: string };


const initialApiKeys: ApiKey[] = [
    { id: "key_1", label: "Aplikasi POS Flutter", key: "sk_live_Abc123DeF4G5H6i7...", created: "29 Oktober 2023" },
];

const initialOutlets: Outlet[] = [
    { id: "out_1", name: "M Perfume Amal - Jakarta Pusat", location: "Jakarta" },
    { id: "out_2", name: "M Perfume Amal - Bandung", location: "Bandung" },
];

const initialPromotions: Promotion[] = [
    { id: "promo_1", name: "Diskon Akhir Pekan", type: "Persentase", value: "15" },
    { id: "promo_2", name: "Potongan Langsung", type: "Nominal", value: "20000" },
    { id: "promo_3", name: "Beli 1 Gratis 1 Parfum Mini", type: "BOGO", value: "PROD005" },
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

const initialBrands: Attribute[] = [
    { id: "brand_1", name: "Luxe Fragrance Co." },
    { id: "brand_2", name: "Aroma Natural" },
    { id: "brand_3", name: "Generic Chemical" },
    { id: "brand_4", name: "SynthScents" },
    { id: "brand_5", name: "GlassPack" },
]


export default function SettingsPage() {
    const { toast } = useToast();
    const { selectedOrganizationId, supabase, loading: authLoading } = useAuth();

    const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
    const [outlets, setOutlets] = useState<Outlet[]>(initialOutlets);
    const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);

    const [isKeyDialogOpen, setKeyDialogOpen] = useState(false);
    const [newKeyLabel, setNewKeyLabel] = useState("");

    const [isOutletDialogOpen, setOutletDialogOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

    const [isPromoDialogOpen, setPromoDialogOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

    const [grades, setGrades] = useState<Grade[]>([]);
    const [isGradeLoading, setIsGradeLoading] = useState(true);
    const [isGradeDialogOpen, setGradeDialogOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<Partial<Grade> | null>(null);

    const [categories, setCategories] = useState<Attribute[]>(initialCategories);
    const [units, setUnits] = useState<Attribute[]>(initialUnits);
    const [brands, setBrands] = useState<Attribute[]>(initialBrands);
    const [isAttrDialogOpen, setAttrDialogOpen] = useState(false);
    const [editingAttr, setEditingAttr] = useState<Attribute & {type: 'Kategori' | 'Unit' | 'Brand'} | null>(null);
    
    // In a real app, this would be saved to a database and probably managed via context/global state
    const [lowStockThreshold, setLowStockThreshold] = useState(200);
    const [loyaltyThreshold, setLoyaltyThreshold] = useState(10);
    const [loyaltyRewardType, setLoyaltyRewardType] = useState('Discount');
    const [loyaltyRewardValue, setLoyaltyRewardValue] = useState('50');
    const [loyaltyFreeProductId, setLoyaltyFreeProductId] = useState('PROD005');

    const fetchGrades = useCallback(async () => {
        if (!selectedOrganizationId || !supabase) {
            setGrades([]);
            setIsGradeLoading(false);
            return;
        }
        setIsGradeLoading(true);
        const { data, error } = await supabase
            .from('grades')
            .select('*')
            .eq('organization_id', selectedOrganizationId);
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data grade.' });
            setGrades([]);
        } else {
            setGrades(data);
        }
        setIsGradeLoading(false);
    }, [selectedOrganizationId, supabase, toast]);

    useEffect(() => {
        if (!authLoading && selectedOrganizationId) {
            fetchGrades();
        } else if (!selectedOrganizationId && !authLoading) {
            setIsGradeLoading(false);
            setGrades([]);
        }
    }, [authLoading, selectedOrganizationId, fetchGrades]);


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
            setOutlets(prev => prev.map(o => o.id === editingOutlet.id ? editingOutlet : o));
        } else {
            const newOutlet = { ...editingOutlet, id: `out_${Date.now()}` };
            setOutlets(prev => [...prev, newOutlet]);
        }
        toast({ title: "Sukses", description: "Outlet berhasil disimpan." });
        setOutletDialogOpen(false);
        setEditingOutlet(null);
    };

    const handleDeleteOutlet = (id: string) => {
        setOutlets(prev => prev.filter(o => o.id !== id));
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

    const handleOpenAttrDialog = (attr: Attribute | null, type: 'Kategori' | 'Unit' | 'Brand') => {
        setEditingAttr(attr ? { ...attr, type } : { id: "", name: "", type });
        setAttrDialogOpen(true);
    };

    const handleSaveAttr = () => {
        if (!editingAttr || !editingAttr.name) {
            toast({ variant: "destructive", title: "Error", description: "Nama atribut harus diisi." });
            return;
        }
        
        let list, setList, prefix;
        switch(editingAttr.type) {
            case 'Kategori': list = categories; setList = setCategories; prefix = 'cat'; break;
            case 'Unit': list = units; setList = setUnits; prefix = 'unit'; break;
            case 'Brand': list = brands; setList = setBrands; prefix = 'brand'; break;
            default: return;
        }

        if (editingAttr.id) {
            setList(prev => prev.map(item => item.id === editingAttr!.id ? {id: item.id, name: editingAttr!.name} : item));
        } else {
            const newItem = { id: `${prefix}_${Date.now()}`, name: editingAttr.name };
            setList(prev => [...prev, newItem]);
        }
        toast({ title: "Sukses", description: `${editingAttr.type} berhasil disimpan.` });
        setAttrDialogOpen(false);
        setEditingAttr(null);
    };

     const handleDeleteAttr = (id: string, type: 'Kategori' | 'Unit' | 'Brand') => {
        const setList = type === 'Kategori' ? setCategories : type === 'Unit' ? setUnits : setBrands;
        setList(prev => prev.filter(item => item.id !== id));
        toast({ title: "Sukses", description: `${type} berhasil dihapus.` });
    };

    const handleOpenGradeDialog = (grade: Partial<Grade> | null = null) => {
        setEditingGrade(grade ? { ...grade } : { name: "", price_multiplier: 1.0, extra_essence_price: 0 });
        setGradeDialogOpen(true);
    };

    const handleSaveGrade = async () => {
        if (!editingGrade || !editingGrade.name || !supabase || !selectedOrganizationId) {
            toast({ variant: "destructive", title: "Error", description: "Nama grade harus diisi." });
            return;
        }
        
        const gradeData = {
            name: editingGrade.name,
            price_multiplier: editingGrade.price_multiplier,
            extra_essence_price: editingGrade.extra_essence_price,
            organization_id: selectedOrganizationId,
        };

        const { error } = editingGrade.id
            ? await supabase.from('grades').update(gradeData).eq('id', editingGrade.id)
            : await supabase.from('grades').insert([gradeData]);

        if (error) {
            toast({ variant: "destructive", title: "Error", description: `Gagal menyimpan grade: ${error.message}` });
        } else {
            toast({ title: "Sukses", description: "Grade berhasil disimpan." });
            setGradeDialogOpen(false);
            fetchGrades();
        }
    };

    const handleDeleteGrade = async (id: string) => {
        if (!supabase) return;
        const { error } = await supabase.from('grades').delete().eq('id', id);
        if (error) {
            toast({ variant: "destructive", title: "Error", description: `Gagal menghapus grade: ${error.message}` });
        } else {
            toast({ title: "Sukses", description: "Grade berhasil dihapus." });
            fetchGrades();
        }
    };


    if (authLoading) {
      return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }


    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold">Pengaturan</h1>
            {!selectedOrganizationId && (
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-yellow-600"/>Pilih Outlet</CardTitle>
                        <CardDescription className="text-yellow-700">
                            Silakan pilih outlet dari menu dropdown di atas untuk melihat dan mengelola pengaturan.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
            <div className="grid gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifikasi</CardTitle>
                        <CardDescription>Atur pemberitahuan untuk berbagai peristiwa dalam aplikasi.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid max-w-md gap-1.5">
                            <Label htmlFor="low-stock-threshold">Ambang Batas Stok Rendah</Label>
                            <Input
                                id="low-stock-threshold"
                                type="number"
                                value={lowStockThreshold}
                                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 0)}
                                disabled={!selectedOrganizationId}
                            />
                            <p className="text-sm text-muted-foreground">
                                Dapatkan notifikasi di dasbor ketika kuantitas bahan berada di bawah angka ini.
                            </p>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Pengaturan Loyalitas Anggota</CardTitle>
                        <CardDescription>Konfigurasikan program hadiah untuk pelanggan setia Anda.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="loyalty-threshold">Ambang Batas Transaksi</Label>
                                <Input id="loyalty-threshold" type="number" value={loyaltyThreshold} onChange={e => setLoyaltyThreshold(parseInt(e.target.value) || 0)} disabled={!selectedOrganizationId}/>
                                <p className="text-sm text-muted-foreground">Jumlah transaksi sebelum anggota mendapat hadiah.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="loyalty-reward-type">Jenis Hadiah</Label>
                                 <Select value={loyaltyRewardType} onValueChange={setLoyaltyRewardType} disabled={!selectedOrganizationId}>
                                    <SelectTrigger id="loyalty-reward-type"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Discount">Diskon Persentase</SelectItem>
                                        <SelectItem value="FreeProduct">Produk Gratis</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">Pilih jenis hadiah yang akan diberikan.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {loyaltyRewardType === 'Discount' ? (
                                <div className="space-y-1.5">
                                    <Label htmlFor="loyalty-reward-value">Nilai Diskon (%)</Label>
                                    <Input id="loyalty-reward-value" type="number" value={loyaltyRewardValue} onChange={e => setLoyaltyRewardValue(e.target.value)} disabled={!selectedOrganizationId}/>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <Label htmlFor="loyalty-free-product">Produk Gratis</Label>
                                    <Select value={loyaltyFreeProductId} onValueChange={setLoyaltyFreeProductId} disabled={!selectedOrganizationId}>
                                        <SelectTrigger id="loyalty-free-product"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {productCatalogForSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Atribut Inventaris & Refill</CardTitle>
                        <CardDescription>Kelola atribut yang digunakan untuk item inventaris dan sistem refill parfum kustom.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="grades">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="grades">Grade</TabsTrigger>
                                <TabsTrigger value="categories">Kategori</TabsTrigger>
                                <TabsTrigger value="units">Unit</TabsTrigger>
                                <TabsTrigger value="brands">Brand</TabsTrigger>
                            </TabsList>
                            {/* Grade Dialog */}
                            <Dialog open={isGradeDialogOpen} onOpenChange={setGradeDialogOpen}>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">
                                        {editingGrade?.id ? `Ubah Grade` : `Tambah Grade Baru`}
                                    </DialogTitle></DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="grade-name" className="text-right">Nama Grade</Label>
                                            <Input id="grade-name" value={editingGrade?.name || ''} onChange={e => setEditingGrade(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="grade-multiplier" className="text-right">Pengali Harga</Label>
                                            <Input id="grade-multiplier" type="number" step="0.1" value={editingGrade?.price_multiplier || 1} onChange={e => setEditingGrade(prev => prev ? {...prev, price_multiplier: parseFloat(e.target.value)} : null)} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="extra-essence-price" className="text-right">Harga Tambahan Bibit (per ml)</Label>
                                            <Input id="extra-essence-price" type="number" step="100" value={editingGrade?.extra_essence_price || 0} onChange={e => setEditingGrade(prev => prev ? {...prev, extra_essence_price: parseFloat(e.target.value)} : null)} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter><Button onClick={handleSaveGrade}>Simpan</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                            {/* Attribute Dialog */}
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
                            <TabsContent value="grades" className="pt-4">
                                <div className="flex justify-end mb-4">
                                    <Button onClick={() => handleOpenGradeDialog(null)} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Grade</Button>
                                </div>
                                <div className="border rounded-md">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nama Grade</TableHead><TableHead>Pengali Harga</TableHead><TableHead>Harga Tambahan Bibit</TableHead><TableHead className="w-[100px] text-right">Aksi</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {isGradeLoading ? (
                                            <TableRow><TableCell colSpan={4} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                                        ) : grades.map(grade => (
                                            <TableRow key={grade.id}>
                                                <TableCell>{grade.name}</TableCell>
                                                <TableCell>{grade.price_multiplier}x</TableCell>
                                                <TableCell>Rp {grade.extra_essence_price.toLocaleString('id-ID')} / ml</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenGradeDialog(grade)}>Ubah</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteGrade(grade.id)}>Hapus</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </TabsContent>
                            <TabsContent value="categories" className="pt-4">
                                <div className="flex justify-end mb-4">
                                    <Button onClick={() => handleOpenAttrDialog(null, 'Kategori')} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Kategori</Button>
                                </div>
                                <div className="border rounded-md">
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
                                </div>
                            </TabsContent>
                            <TabsContent value="units" className="pt-4">
                                <div className="flex justify-end mb-4">
                                     <Button onClick={() => handleOpenAttrDialog(null, 'Unit')} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Unit</Button>
                                </div>
                                <div className="border rounded-md">
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
                                </div>
                            </TabsContent>
                             <TabsContent value="brands" className="pt-4">
                                <div className="flex justify-end mb-4">
                                     <Button onClick={() => handleOpenAttrDialog(null, 'Brand')} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Brand</Button>
                                </div>
                                <div className="border rounded-md">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nama Brand</TableHead><TableHead className="w-[100px] text-right">Aksi</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {brands.map(brand => (
                                            <TableRow key={brand.id}>
                                                <TableCell>{brand.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleOpenAttrDialog(brand, 'Brand')}>Ubah</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAttr(brand.id, 'Brand')}>Hapus</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
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
                                <DialogTrigger asChild><Button disabled={!selectedOrganizationId}>Buat Kunci Baru</Button></DialogTrigger>
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
                                             <Button variant="destructive" size="sm" onClick={() => handleRevokeKey(key.id)} disabled={!selectedOrganizationId}>Cabut</Button>
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
                                <DialogTrigger asChild><Button onClick={() => handleOpenOutletDialog()} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Outlet Baru</Button></DialogTrigger>
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
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={!selectedOrganizationId}><span className="sr-only">Buka menu</span><MoreHorizontal className="h-4 w-4" /></Button>
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
                                <DialogTrigger asChild><Button onClick={() => handleOpenPromoDialog()} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Buat Promosi Baru</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle className="font-headline">{editingPromo?.id ? 'Ubah Promosi' : 'Buat Promosi Baru'}</DialogTitle></DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="promo-name" className="text-right">Nama</Label>
                                            <Input id="promo-name" value={editingPromo?.name || ''} onChange={e => setEditingPromo(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3" placeholder="e.g., Diskon Akhir Tahun" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="promo-type" className="text-right">Jenis</Label>
                                            <Select value={editingPromo?.type} onValueChange={(value) => setEditingPromo(prev => prev ? {...prev, type: value, value: ""} : null)}>
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
                                            {editingPromo?.type === 'BOGO' ? (
                                                <Select value={editingPromo.value} onValueChange={(value) => setEditingPromo(prev => prev ? {...prev, value: value} : null)}>
                                                     <SelectTrigger id="promo-value" className="col-span-3">
                                                        <SelectValue placeholder="Pilih produk gratis" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {productCatalogForSettings.map(product => (
                                                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input id="promo-value" value={editingPromo?.value || ''} onChange={e => setEditingPromo(prev => prev ? {...prev, value: e.target.value} : null)} className="col-span-3" placeholder="e.g., 15 atau 20000" />
                                            )}
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
                                        <TableCell>
                                            {promo.type === 'BOGO' 
                                                ? productCatalogForSettings.find(p => p.id === promo.value)?.name || promo.value
                                                : promo.value
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={!selectedOrganizationId}><span className="sr-only">Buka menu</span><MoreHorizontal className="h-4 w-4" /></Button>
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
                         <Button disabled={!selectedOrganizationId}>Tambah Pengguna Baru</Button>
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
                            <Select defaultValue="id" disabled={!selectedOrganizationId}>
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
