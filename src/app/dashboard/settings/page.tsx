
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, User, Languages, Key, Store, MoreHorizontal, PlusCircle } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type ApiKey = { id: string; label: string; key: string; created: string };
type Outlet = { id: string; name: string; location: string };

const initialApiKeys: ApiKey[] = [
    { id: "key_1", label: "Aplikasi POS Flutter", key: "sk_live_Abc123DeF4G5H6i7...", created: "29 Oktober 2023" },
];

const initialOutlets: Outlet[] = [
    { id: "out_1", name: "ScentPOS - Jakarta Pusat", location: "Jakarta" },
    { id: "out_2", name: "ScentPOS - Bandung", location: "Bandung" },
];

export default function SettingsPage() {
    const { toast } = useToast();

    const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
    const [outlets, setOutlets] = useState<Outlet[]>(initialOutlets);

    const [isKeyDialogOpen, setKeyDialogOpen] = useState(false);
    const [newKeyLabel, setNewKeyLabel] = useState("");

    const [isOutletDialogOpen, setOutletDialogOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

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

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-headline text-3xl font-bold">Pengaturan</h1>
            <div className="grid gap-6">
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
                        <Button>Buat Promosi Baru</Button>
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

    