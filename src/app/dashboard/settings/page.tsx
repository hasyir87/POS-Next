
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, User, Languages, Key, Store, MoreHorizontal, PlusCircle, Package, Bell, Star, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth, type Organization } from "@/context/auth-context";
import { getFirestore, doc, updateDoc, addDoc, deleteDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';
import { fetchWithAuth } from "@/lib/utils";

// Local types
interface Grade {
  id: string;
  organization_id: string;
  name: string;
  price_multiplier: number;
  extra_essence_price: number;
}

export default function SettingsPage() {
    const { toast } = useToast();
    const { profile, selectedOrganizationId, loading: authLoading, refreshProfile } = useAuth();
    const db = getFirestore(firebaseApp);

    const [outlets, setOutlets] = useState<Organization[]>([]);
    const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);

    const [isOutletDialogOpen, setOutletDialogOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Partial<Organization> | null>(null);

    const [grades, setGrades] = useState<Grade[]>([]);
    const [isGradeLoading, setIsGradeLoading] = useState(true);
    const [isGradeDialogOpen, setGradeDialogOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<Partial<Grade> | null>(null);
    
    const [lowStockThreshold, setLowStockThreshold] = useState(200);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchGrades = useCallback(async () => {
        if (!selectedOrganizationId) {
            setGrades([]);
            setIsGradeLoading(false);
            return;
        }
        setIsGradeLoading(true);
        try {
            const gradesRef = collection(db, 'grades');
            const q = query(gradesRef, where('organization_id', '==', selectedOrganizationId));
            const querySnapshot = await getDocs(q);
            const gradesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
            setGrades(gradesData);
        } catch (error) {
            console.error("Error fetching grades:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data grade."});
        } finally {
            setIsGradeLoading(false);
        }
    }, [selectedOrganizationId, db, toast]);
    
    const fetchOutlets = useCallback(async () => {
        if (!profile?.organization_id) {
            setOutlets([]);
            setIsLoadingOutlets(false);
            return;
        }
        setIsLoadingOutlets(true);
        try {
            const orgsRef = collection(db, 'organizations');
            const mainOrgRef = doc(orgsRef, profile.organization_id);
            const mainOrgSnap = await getDoc(mainOrgRef);
            if (!mainOrgSnap.exists()) throw new Error("Organisasi utama tidak ditemukan.");

            const mainOrgData = { id: mainOrgSnap.id, ...mainOrgSnap.data() } as Organization;
            const parentId = mainOrgData.parent_organization_id || mainOrgData.id;
            
            const q = query(orgsRef, where('parent_organization_id', '==', parentId));
            const parentDoc = await getDoc(doc(orgsRef, parentId));
            
            const [parentSnap, childrenSnap] = await Promise.all([parentDoc, getDocs(q)]);

            const orgMap = new Map<string, Organization>();
            if (parentSnap.exists()) orgMap.set(parentSnap.id, { id: parentSnap.id, ...parentSnap.data() } as Organization);
            childrenSnap.forEach(doc => orgMap.set(doc.id, { id: doc.id, ...doc.data() } as Organization));

             // Make sure the main organization is included if it's not a child
            if (profile.organization_id && !orgMap.has(profile.organization_id)) {
                const mainOrgDoc = await getDoc(doc(db, 'organizations', profile.organization_id));
                if (mainOrgDoc.exists()) {
                    orgMap.set(mainOrgDoc.id, { id: mainOrgDoc.id, ...mainOrgDoc.data() } as Organization);
                }
            }
            
            const allOrgs = Array.from(orgMap.values());
            
            setOutlets(allOrgs);

            const selectedOrgData = allOrgs.find(o => o.id === selectedOrganizationId);
            if (selectedOrgData && typeof selectedOrgData.low_stock_threshold === 'number') {
                setLowStockThreshold(selectedOrgData.low_stock_threshold);
            } else {
                setLowStockThreshold(200); // Default value
            }

        } catch (error: any) {
            console.error("Error fetching outlets:", error);
            toast({ variant: "destructive", title: "Error", description: `Gagal mengambil data outlet: ${error.message}`});
        } finally {
            setIsLoadingOutlets(false);
        }
    }, [profile, db, toast, selectedOrganizationId]);


    useEffect(() => {
        if (!authLoading && (profile?.role === 'owner' || profile?.role === 'superadmin')) {
            fetchOutlets();
        }
        if (!authLoading && selectedOrganizationId) {
            fetchGrades();
        } else if (!selectedOrganizationId && !authLoading) {
            setIsGradeLoading(false);
            setGrades([]);
            setIsLoadingOutlets(false);
            setOutlets([]);
        }
    }, [authLoading, selectedOrganizationId, profile, fetchGrades, fetchOutlets]);

    const handleOpenOutletDialog = (outlet: Partial<Organization> | null = null) => {
        setEditingOutlet(outlet ? { ...outlet } : { name: "" });
        setOutletDialogOpen(true);
    };

    const handleSaveOutlet = async () => {
        if (!editingOutlet || !editingOutlet.name) {
            toast({ variant: "destructive", title: "Error", description: "Nama outlet tidak boleh kosong." });
            return;
        }

        if (!profile?.organization_id) {
            toast({ variant: "destructive", title: "Error", description: "Organisasi induk tidak ditemukan." });
            return;
        }
        
        setIsSubmitting(true);
        try {
            if (editingOutlet.id) {
                // UPDATE logic
                await fetchWithAuth('updateOutlet', {
                    outletId: editingOutlet.id,
                    outletName: editingOutlet.name,
                });
                toast({ title: "Sukses", description: "Nama outlet berhasil diperbarui." });
            } else {
                // CREATE logic
                const mainOrganization = await getDoc(doc(db, 'organizations', profile.organization_id));
                const parentId = mainOrganization.data()?.parent_organization_id || profile.organization_id;
                
                await fetchWithAuth('createOutlet', {
                    outletName: editingOutlet.name,
                    parentOrganizationId: parentId,
                });
                toast({ title: "Sukses", description: "Outlet baru berhasil dibuat." });
            }
            setOutletDialogOpen(false);
            setEditingOutlet(null);
            await fetchOutlets();
            await refreshProfile();
        } catch (error: any) {
            console.error("Error saving outlet:", error);
            const errorMessage = error.message || "Terjadi kesalahan yang tidak diketahui.";
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteOutlet = async (outletId: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus outlet ini? Tindakan ini tidak dapat dibatalkan.")) return;
        
        setIsSubmitting(true);
        try {
            await fetchWithAuth('deleteOutlet', { outletId });
            toast({ title: "Sukses", description: "Outlet berhasil dihapus." });
            await fetchOutlets();
            await refreshProfile();
        } catch (error: any) {
             console.error("Error deleting outlet:", error);
             const errorMessage = error.message || "Terjadi kesalahan yang tidak diketahui.";
            toast({ variant: "destructive", title: "Gagal Menghapus", description: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenGradeDialog = (grade: Partial<Grade> | null = null) => {
        setEditingGrade(grade ? { ...grade } : { name: "", price_multiplier: 1.0, extra_essence_price: 0 });
        setGradeDialogOpen(true);
    };

    const handleSaveGrade = async () => {
        if (!editingGrade || !editingGrade.name || !selectedOrganizationId) {
            toast({ variant: "destructive", title: "Error", description: "Nama grade harus diisi." });
            return;
        }
        
        setIsSubmitting(true);
        const gradeData = {
            name: editingGrade.name,
            price_multiplier: editingGrade.price_multiplier,
            extra_essence_price: editingGrade.extra_essence_price,
            organization_id: selectedOrganizationId,
        };

        try {
            if (editingGrade.id) {
                await updateDoc(doc(db, 'grades', editingGrade.id), gradeData);
            } else {
                await addDoc(collection(db, 'grades'), gradeData);
            }
             toast({ title: "Sukses", description: "Grade berhasil disimpan." });
             setGradeDialogOpen(false);
             fetchGrades();
        } catch (error: any) {
             toast({ variant: "destructive", title: "Error", description: `Gagal menyimpan grade: ${error.message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGrade = async (id: string) => {
        if (!confirm("Anda yakin ingin menghapus grade ini?")) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, 'grades', id));
            toast({ title: "Sukses", description: "Grade berhasil dihapus." });
            fetchGrades();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: `Gagal menghapus grade: ${error.message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedOrganizationId) {
            toast({ variant: "destructive", title: "Error", description: "Pilih outlet terlebih dahulu."});
            return;
        }
        setIsSavingSettings(true);
        try {
            const orgRef = doc(db, 'organizations', selectedOrganizationId);
            await updateDoc(orgRef, {
                low_stock_threshold: lowStockThreshold
            });
            toast({ title: "Sukses", description: "Pengaturan berhasil disimpan."});
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal menyimpan pengaturan."});
        } finally {
            setIsSavingSettings(false);
        }
    };


    if (authLoading) {
      return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    const canManageOutlets = profile?.role === 'owner' || profile?.role === 'superadmin' || profile?.role === 'admin';

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold">Pengaturan</h1>
            
            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">Umum</TabsTrigger>
                    <TabsTrigger value="outlets" disabled={!canManageOutlets}>Outlet</TabsTrigger>
                    <TabsTrigger value="users" disabled={!canManageOutlets}>Staf & Peran</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-6 mt-4">
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
                        <CardFooter>
                            <Button onClick={handleSaveSettings} disabled={!selectedOrganizationId || isSavingSettings}>
                                {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Simpan Pengaturan
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Grade Refill</CardTitle>
                            <CardDescription>Kelola tingkatan kualitas parfum refill yang tersedia di outlet Anda.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Grade Dialog */}
                            <Dialog open={isGradeDialogOpen} onOpenChange={setGradeDialogOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="font-headline">
                                            {editingGrade?.id ? `Ubah Grade` : `Tambah Grade Baru`}
                                        </DialogTitle>
                                    </DialogHeader>
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
                                    <DialogFooter><Button onClick={handleSaveGrade} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Simpan</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <div className="flex justify-end mb-4">
                                <Button onClick={() => handleOpenGradeDialog(null)} disabled={!selectedOrganizationId}><PlusCircle className="mr-2" /> Tambah Grade</Button>
                            </div>
                            <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Nama Grade</TableHead>
                                    <TableHead>Pengali Harga</TableHead>
                                    <TableHead>Harga Tambahan Bibit</TableHead>
                                    <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isGradeLoading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : !selectedOrganizationId ? (
                                        <TableRow><TableCell colSpan={4} className="text-center p-4 text-muted-foreground">Pilih outlet untuk melihat grade.</TableCell></TableRow>
                                    ) : grades.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center p-4">Belum ada grade untuk outlet ini.</TableCell></TableRow>
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
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outlets" className="space-y-6 mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Manajemen Outlet</CardTitle>
                            <CardDescription>Kelola semua lokasi atau cabang bisnis Anda.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-end mb-4">
                                <Dialog open={isOutletDialogOpen} onOpenChange={setOutletDialogOpen}>
                                    <DialogTrigger asChild><Button onClick={() => handleOpenOutletDialog()} disabled={!canManageOutlets}><PlusCircle className="mr-2" /> Tambah Outlet Baru</Button></DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                        <DialogTitle className="font-headline">{editingOutlet?.id ? 'Ubah Outlet' : 'Tambah Outlet Baru'}</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="outlet-name" className="text-right">Nama</Label>
                                                <Input id="outlet-name" value={editingOutlet?.name || ''} onChange={e => setEditingOutlet(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3" />
                                            </div>
                                        </div>
                                        <DialogFooter><Button onClick={handleSaveOutlet} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Simpan</Button></DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Outlet</TableHead>
                                        <TableHead>ID</TableHead>
                                        <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingOutlets ? (
                                        <TableRow><TableCell colSpan={3} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : outlets.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} className="text-center p-4 text-muted-foreground">Tidak ada outlet yang dikelola.</TableCell></TableRow>
                                    ) : outlets.map(outlet => (
                                        <TableRow key={outlet.id}>
                                            <TableCell className="font-medium">{outlet.name} {outlet.id === profile?.organization?.parent_organization_id || (outlet.id === profile?.organization_id && !profile?.organization?.parent_organization_id) ? '(Induk)' : ''}</TableCell>
                                            <TableCell className="font-mono text-xs">{outlet.id}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting || !outlet.parent_organization_id}>
                                                        <span className="sr-only">Buka menu</span><MoreHorizontal className="h-4 w-4" />
                                                        </Button>
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
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Manajemen Staf</CardTitle>
                            <CardDescription>Kelola akun staf dan peran mereka (Kasir, Admin, Pemilik).</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                            <Button asChild><Link href="/dashboard/users">Kelola Staf</Link></Button>
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/settings/roles">Kelola Peran & Izin</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    )
}
