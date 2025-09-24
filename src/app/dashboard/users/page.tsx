
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, type UserProfile, type Organization } from '@/context/auth-context';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal, Users, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';

export default function UsersPage() {
    const { toast } = useToast();
    const { user, profile: currentProfile, loading: authLoading, selectedOrganizationId } = useAuth();
    const db = getFirestore(firebaseApp);

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<UserProfile & {password?: string}>>({});

    const fetchUsers = useCallback(async () => {
        if (!selectedOrganizationId) return;
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'profiles');
            const usersQuery = query(usersRef, where('organization_id', '==', selectedOrganizationId));
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
            setUsers(usersData);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Gagal memuat data: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    }, [selectedOrganizationId, toast, db]);

    useEffect(() => {
        if (!authLoading && selectedOrganizationId) {
            fetchUsers();
        } else if (!authLoading && !selectedOrganizationId) {
            setIsLoading(false);
            setUsers([]);
        }
    }, [authLoading, selectedOrganizationId, fetchUsers]);

    const handleOpenDialog = (user: Partial<UserProfile> | null = null) => {
        const emptyUser: Partial<UserProfile & {password?: string}> = { 
            full_name: '', 
            email: '', 
            role: 'cashier', 
            organization_id: selectedOrganizationId || '',
            password: ''
        };
        setEditingUser(user ? { ...user } : emptyUser);
        setDialogOpen(true);
    };

    const handleSaveUser = async () => {
        // Temporarily disabled
        toast({ title: "Fitur Dinonaktifkan", description: "Fitur simpan pengguna sedang dalam perbaikan." });
    };

    const handleDeleteUser = async (userId: string) => {
        // Temporarily disabled
        toast({ title: "Fitur Dinonaktifkan", description: "Fitur hapus pengguna sedang dalam perbaikan." });
    };
    
    if (authLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    const canManageUsers = currentProfile && (currentProfile.role === 'owner' || currentProfile.role === 'admin' || currentProfile.role === 'superadmin');

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8" /> Manajemen Pengguna</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()} disabled={!canManageUsers || !selectedOrganizationId}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengguna
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingUser?.id ? 'Ubah Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="full_name" className="text-right">Nama</Label>
                                <Input id="full_name" value={editingUser?.full_name || ''} onChange={(e) => setEditingUser(p => ({...p, full_name: e.target.value}))} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" value={editingUser?.email || ''} onChange={(e) => setEditingUser(p => ({...p, email: e.target.value}))} className="col-span-3" disabled={!!editingUser?.id} />
                            </div>
                             {!editingUser?.id && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">Password</Label>
                                    <Input id="password" type="password" value={editingUser?.password || ''} onChange={(e) => setEditingUser(p => ({...p, password: e.target.value}))} className="col-span-3" />
                                </div>
                             )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">Peran</Label>
                                <Select value={editingUser?.role || ''} onValueChange={(value: UserProfile['role']) => setEditingUser(p => ({...p, role: value}))}>
                                    <SelectTrigger id="role" className="col-span-3"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="cashier">Kasir</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveUser} type="submit" disabled={true}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pengguna</CardTitle>
                    <CardDescription>Kelola akun staf Anda untuk outlet yang dipilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Pengguna</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-center">Peran</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : !selectedOrganizationId ? (
                                     <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Pilih outlet untuk melihat pengguna.</TableCell></TableRow>
                                ) : users.length === 0 ? (
                                     <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Tidak ada pengguna untuk outlet ini.</TableCell></TableRow>
                                ) : users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{user.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting || user.id === currentProfile?.id}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(user)} disabled={user.role === 'owner'}>Ubah</DropdownMenuItem>
                                                    {user.role !== 'owner' && (
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>Hapus</DropdownMenuItem>
                                                    )}
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
        </div>
    );
}
