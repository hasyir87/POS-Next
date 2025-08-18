
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
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
import type { UserProfile, Organization } from '@/types/database';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
    const { toast } = useToast();
    const { profile: currentProfile, loading: authLoading, fetchWithAuth } = useAuth();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<UserProfile & {password?: string}> | null>(null);

    const emptyUser: Partial<UserProfile> = { full_name: '', email: '', role: 'cashier', organization_id: currentProfile?.organization_id || '' };

    const fetchUsersAndOrgs = useCallback(async () => {
        setIsLoading(true);
        try {
            const usersPromise = fetchWithAuth('/api/users');
            const orgsPromise = fetchWithAuth('/api/organizations');

            const [usersRes, orgsRes] = await Promise.all([usersPromise, orgsPromise]);

            if (!usersRes.ok || !orgsRes.ok) {
                const userError = usersRes.ok ? null : await usersRes.json();
                const orgError = orgsRes.ok ? null : await orgsRes.json();
                throw new Error(userError?.error || orgError?.error || 'Gagal mengambil data');
            }

            const usersData = await usersRes.json();
            const orgsData = await orgsRes.json();
            
            setUsers(usersData.users || []);
            setOrganizations(orgsData || []);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Gagal memuat data: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    }, [fetchWithAuth, toast]);

    useEffect(() => {
        if (!authLoading && currentProfile) {
            fetchUsersAndOrgs();
        }
    }, [authLoading, currentProfile, fetchUsersAndOrgs]);

    const handleOpenDialog = (user: Partial<UserProfile> | null = null) => {
        setEditingUser(user ? { ...user } : { ...emptyUser, organization_id: currentProfile?.organization_id || '' });
        setDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser || !editingUser.full_name || !editingUser.email || !editingUser.role || !editingUser.organization_id) {
            toast({ variant: 'destructive', title: 'Error', description: 'Semua field harus diisi.' });
            return;
        }
        
        if(!editingUser.id && (!editingUser.password || editingUser.password.length < 6)){
             toast({ variant: 'destructive', title: 'Error', description: 'Password harus diisi minimal 6 karakter.' });
            return;
        }

        setIsSubmitting(true);

        const url = editingUser.id ? `/api/users/${editingUser.id}` : '/api/users';
        const method = editingUser.id ? 'PUT' : 'POST';
        const body = editingUser.id
            ? { full_name: editingUser.full_name, role: editingUser.role, organization_id: editingUser.organization_id }
            : { ...editingUser };
        
        try {
            const response = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Gagal menyimpan pengguna.');

            toast({ title: 'Sukses', description: `Pengguna berhasil ${editingUser.id ? 'diperbarui' : 'ditambahkan'}.` });
            setDialogOpen(false);
            fetchUsersAndOrgs();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini? Operasi ini tidak dapat dibatalkan.')) return;
        
        try {
            const response = await fetchWithAuth(`/api/users/${userId}`, { method: 'DELETE' });
            if (!response.ok) {
                 const data = await response.json();
                 throw new Error(data.error || 'Gagal menghapus pengguna.');
            }
            toast({ title: 'Sukses', description: 'Pengguna berhasil dihapus.' });
            fetchUsersAndOrgs();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };
    
    if (authLoading || isLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8" /> Manajemen Pengguna</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()} disabled={!currentProfile}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengguna
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingUser?.id ? 'Ubah Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
                            <DialogDescription>
                                {editingUser?.id ? 'Ubah detail pengguna yang sudah ada.' : 'Buat akun baru untuk staf Anda.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="full_name" className="text-right">Nama</Label>
                                <Input id="full_name" value={editingUser?.full_name || ''} onChange={(e) => setEditingUser(p => p ? {...p, full_name: e.target.value} : null)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input id="email" type="email" value={editingUser?.email || ''} onChange={(e) => setEditingUser(p => p ? {...p, email: e.target.value} : null)} className="col-span-3" disabled={!!editingUser?.id} />
                            </div>
                             {!editingUser?.id && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">Password</Label>
                                    <Input id="password" type="password" value={editingUser?.password || ''} onChange={(e) => setEditingUser(p => p ? {...p, password: e.target.value} : null)} className="col-span-3" />
                                </div>
                             )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">Peran</Label>
                                <Select value={editingUser?.role || ''} onValueChange={(value: UserProfile['role']) => setEditingUser(p => p ? {...p, role: value} : null)}>
                                    <SelectTrigger id="role" className="col-span-3"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="cashier">Kasir</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="organization_id" className="text-right">Outlet</Label>
                                <Select value={editingUser?.organization_id || ''} onValueChange={(value) => setEditingUser(p => p ? {...p, organization_id: value} : null)} disabled={currentProfile?.role !== 'superadmin'}>
                                    <SelectTrigger id="organization_id" className="col-span-3"><SelectValue placeholder="Pilih Outlet..." /></SelectTrigger>
                                    <SelectContent>
                                        {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveUser} type="submit" disabled={isSubmitting}>
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
                    <CardDescription>Kelola akun staf Anda dan peran mereka di berbagai outlet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Pengguna</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Outlet</TableHead>
                                    <TableHead className="text-center">Peran</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{(user.organizations as Organization)?.name || organizations.find(o => o.id === user.organization_id)?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{user.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                           <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={user.id === currentProfile?.id}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(user)}>Ubah</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>Hapus</DropdownMenuItem>
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
