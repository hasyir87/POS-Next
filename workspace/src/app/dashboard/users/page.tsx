
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal, Users, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, Organization } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, deleteUser as deleteAuthUser } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase/config';

// NOTE: Creating a separate auth instance for user management actions
// to avoid conflicts with the main app's auth state.
const secondaryAuth = getAuth(firebaseApp);

export default function UsersPage() {
    const { toast } = useToast();
    const { profile: currentProfile, loading: authLoading, selectedOrganizationId } = useAuth();
    const db = getFirestore(firebaseApp);

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<UserProfile & {password?: string}>>({});

    const emptyUser: Partial<UserProfile> = { full_name: '', email: '', role: 'cashier', organization_id: selectedOrganizationId || '' };

    const fetchUsersAndOrgs = useCallback(async () => {
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
            fetchUsersAndOrgs();
        } else if (!authLoading && !selectedOrganizationId) {
            setIsLoading(false);
            setUsers([]);
        }
    }, [authLoading, selectedOrganizationId, fetchUsersAndOrgs]);

    const handleOpenDialog = (user: Partial<UserProfile> | null = null) => {
        setEditingUser(user ? { ...user } : { ...emptyUser, organization_id: selectedOrganizationId || '' });
        setDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser || !editingUser.full_name || !editingUser.email || !editingUser.role) {
            toast({ variant: 'destructive', title: 'Error', description: 'Nama, Email, dan Peran harus diisi.' });
            return;
        }
        
        if(!editingUser.id && (!editingUser.password || editingUser.password.length < 6)){
             toast({ variant: 'destructive', title: 'Error', description: 'Password harus diisi minimal 6 karakter.' });
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingUser.id) { // Update existing user
                const userDocRef = doc(db, 'profiles', editingUser.id);
                await updateDoc(userDocRef, {
                    full_name: editingUser.full_name,
                    role: editingUser.role,
                });
                toast({ title: 'Sukses', description: `Pengguna berhasil diperbarui.` });
            } else { // Create new user client-side
                let newUserCredential;
                try {
                    // We create the user with a secondary auth instance to not affect current user's session
                    newUserCredential = await createUserWithEmailAndPassword(secondaryAuth, editingUser.email, editingUser.password!);
                    const newUser = newUserCredential.user;

                    // Now create the profile for the new user
                    await setDoc(doc(db, "profiles", newUser.uid), {
                        id: newUser.uid,
                        email: editingUser.email,
                        full_name: editingUser.full_name,
                        role: editingUser.role,
                        organization_id: selectedOrganizationId,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

                    toast({ title: 'Sukses', description: 'Pengguna baru berhasil dibuat.'});
                } catch (error: any) {
                    // If user creation in auth fails, we show the error.
                    // If it succeeds but firestore fails, we should ideally delete the auth user.
                    if (newUserCredential) {
                       // await deleteAuthUser(newUserCredential.user);
                       // Deleting user can be complex due to re-authentication needs, so we log it for now.
                       console.error("Auth user created but Firestore profile failed. Manual cleanup may be needed for UID:", newUserCredential.user.uid);
                    }
                    if (error.code === 'auth/email-already-in-use') {
                        throw new Error('Email ini sudah digunakan oleh pengguna lain.');
                    }
                    throw error;
                }
            }
            setDialogOpen(false);
            fetchUsersAndOrgs();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat diurungkan.')) return;
        
        setIsSubmitting(true);
        try {
            // Firestore security rules should be configured to allow an 'owner' or 'admin' to delete profiles.
            // Deleting the auth user from the client is complex and requires re-authentication,
            // so for now we will just delete the profile. A more robust solution might use an admin backend.
            await deleteDoc(doc(db, 'profiles', userId));
            toast({ title: 'Sukses', description: 'Profil pengguna berhasil dihapus. Akun login masih ada dan harus dihapus dari Firebase Console.' });
            fetchUsersAndOrgs();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
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
                    <Button onClick={() => handleOpenDialog()} disabled={!canManageUsers || !selectedOrganizationId}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengguna
                    </Button>
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
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={user.id === currentProfile?.id || user.role === 'owner'}>
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
