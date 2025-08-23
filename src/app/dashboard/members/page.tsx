
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreHorizontal, Users, Star, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import type { Customer } from "@/types/database";
import { getFirestore, collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';

const getLoyaltyLevel = (transactionCount: number): "Bronze" | "Silver" | "Gold" => {
    if (transactionCount >= 20) return "Gold";
    if (transactionCount >= 10) return "Silver";
    return "Bronze";
};

export default function MembersPage() {
    const { toast } = useToast();
    const { selectedOrganizationId, loading: authLoading } = useAuth();
    const db = getFirestore(firebaseApp);
    
    const [members, setMembers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Partial<Customer> | null>(null);

    const emptyMember: Partial<Customer> = { name: "", email: "", phone: "", transaction_count: 0, loyalty_points: 0 };

    const fetchMembers = useCallback(async () => {
        if (!selectedOrganizationId) {
            setMembers([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const q = query(collection(db, "customers"), where("organization_id", "==", selectedOrganizationId));
            const querySnapshot = await getDocs(q);
            const membersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setMembers(membersData);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data anggota." });
            setMembers([]);
        }
        setIsLoading(false);
    }, [selectedOrganizationId, db, toast]);

    useEffect(() => {
        if (!authLoading && selectedOrganizationId) {
            fetchMembers();
        } else if (!selectedOrganizationId && !authLoading) {
            setMembers([]);
            setIsLoading(false);
        }
    }, [selectedOrganizationId, authLoading, fetchMembers]);

    const handleOpenDialog = (member: Partial<Customer> | null = null) => {
        setEditingMember(member ? { ...member } : emptyMember);
        setDialogOpen(true);
    };

    const handleSaveMember = async () => {
        if (!editingMember || !editingMember.name || !editingMember.email) {
            toast({ variant: "destructive", title: "Error", description: "Nama dan email anggota harus diisi." });
            return;
        }

        const memberData = {
            name: editingMember.name,
            email: editingMember.email,
            phone: editingMember.phone,
            transaction_count: editingMember.transaction_count || 0,
            loyalty_points: editingMember.loyalty_points || 0,
            organization_id: selectedOrganizationId,
        };

        try {
            if (editingMember.id) {
                const memberRef = doc(db, 'customers', editingMember.id);
                await updateDoc(memberRef, memberData);
            } else {
                await addDoc(collection(db, 'customers'), memberData);
            }
            toast({ title: "Sukses", description: "Data anggota berhasil disimpan." });
            setDialogOpen(false);
            setEditingMember(null);
            fetchMembers();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: `Gagal menyimpan anggota: ${error.message}` });
        }
    };
    
    const handleDeleteMember = async (id: string) => {
        if(!confirm("Apakah Anda yakin ingin menghapus anggota ini?")) return;
        try {
            await deleteDoc(doc(db, 'customers', id));
            toast({ title: "Sukses", description: "Data anggota berhasil dihapus." });
            fetchMembers();
        } catch(error: any) {
            toast({ variant: "destructive", title: "Error", description: `Gagal menghapus anggota: ${error.message}` });
        }
    };
    
    if(authLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="font-headline text-3xl font-bold flex items-center gap-2 shrink-0"><Users className="h-8 w-8" /> Manajemen Anggota</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto" disabled={!selectedOrganizationId}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Anggota Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingMember?.id ? 'Ubah Anggota' : 'Tambah Anggota Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nama</Label>
                                <Input id="name" placeholder="Nama lengkap anggota" className="col-span-3" value={editingMember?.name || ''} onChange={(e) => setEditingMember(prev => prev ? {...prev, name: e.target.value} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" placeholder="email@contoh.com" className="col-span-3" value={editingMember?.email || ''} onChange={(e) => setEditingMember(prev => prev ? {...prev, email: e.target.value} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">Telepon</Label>
                                <Input id="phone" type="tel" placeholder="08123456xxxx" className="col-span-3" value={editingMember?.phone || ''} onChange={(e) => setEditingMember(prev => prev ? {...prev, phone: e.target.value} : null)} />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="transaction_count" className="text-right">Jml Transaksi</Label>
                                <Input id="transaction_count" type="number" className="col-span-3" value={editingMember?.transaction_count || '0'} onChange={(e) => setEditingMember(prev => prev ? {...prev, transaction_count: parseInt(e.target.value) || 0} : null)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveMember} type="submit">Simpan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Anggota</CardTitle>
                    <CardDescription>Kelola pelanggan setia Anda dan lacak total transaksi mereka untuk program loyalitas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Kontak</TableHead>
                                    <TableHead className="text-center">Tingkatan</TableHead>
                                    <TableHead className="text-center">Total Transaksi</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : !selectedOrganizationId ? (
                                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Pilih outlet untuk melihat anggota.</TableCell></TableRow>
                                ) : members.length > 0 ? (
                                    members.map((member) => {
                                        const level = getLoyaltyLevel(member.transaction_count);
                                        return (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <div className="font-medium">{member.name}</div>
                                                    <div className="text-sm text-muted-foreground">{member.id}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>{member.email}</div>
                                                    <div className="text-sm text-muted-foreground">{member.phone}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={level === 'Gold' ? 'default' : level === 'Silver' ? 'secondary' : 'outline'}
                                                        className={level === 'Gold' ? 'bg-yellow-500 text-black' : level === 'Silver' ? 'bg-slate-400 text-white' : ''}
                                                    >{level}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-medium">{member.transaction_count}</TableCell>
                                                <TableCell>
                                                <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Buka menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleOpenDialog(member)}>Ubah</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMember(member.id)}>Hapus</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="text-center">Tidak ada anggota untuk outlet ini.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
