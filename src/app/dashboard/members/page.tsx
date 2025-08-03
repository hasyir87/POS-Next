
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type Member = {
    id: string;
    name: string;
    email: string;
    phone: string;
    level: "Bronze" | "Silver" | "Gold";
};

const initialMembers: Member[] = [
    { id: "MEM001", name: "Andi Wijaya", email: "andi.w@example.com", phone: "081234567890", level: "Gold" },
    { id: "MEM002", name: "Bunga Citra", email: "bunga.c@example.com", phone: "082345678901", level: "Silver" },
    { id: "MEM003", name: "Charlie Dharmawan", email: "charlie.d@example.com", phone: "083456789012", level: "Bronze" },
];


export default function MembersPage() {
    const { toast } = useToast();
    const [members, setMembers] = useState<Member[]>(initialMembers);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const emptyMember: Member = { id: "", name: "", email: "", phone: "", level: "Bronze" };

    const handleOpenDialog = (member: Member | null = null) => {
        setEditingMember(member ? { ...member } : emptyMember);
        setDialogOpen(true);
    };

    const handleSaveMember = () => {
        if (!editingMember || !editingMember.name || !editingMember.email) {
            toast({ variant: "destructive", title: "Error", description: "Nama dan email anggota harus diisi." });
            return;
        }

        if (editingMember.id) {
            // Update existing member
            setMembers(members.map(mem => mem.id === editingMember.id ? editingMember : mem));
            toast({ title: "Sukses", description: "Data anggota berhasil diperbarui." });
        } else {
            // Add new member
            const newMember = { ...editingMember, id: `MEM${(members.length + 1).toString().padStart(3, '0')}` };
            setMembers(prev => [...prev, newMember]);
            toast({ title: "Sukses", description: "Anggota baru berhasil ditambahkan." });
        }
        setDialogOpen(false);
        setEditingMember(null);
    };
    
    const handleDeleteMember = (id: string) => {
        setMembers(members.filter(mem => mem.id !== id));
        toast({ title: "Sukses", description: "Data anggota berhasil dihapus." });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8" /> Manajemen Anggota</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Anggota Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingMember?.id ? 'Ubah Anggota' : 'Tambah Anggota Baru'}</DialogTitle>
                            <DialogDescription>
                                {editingMember?.id ? 'Ubah detail anggota yang sudah ada.' : 'Daftarkan anggota baru.'}
                            </DialogDescription>
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
                                <Label htmlFor="level" className="text-right">Tingkatan</Label>
                                <Select value={editingMember?.level} onValueChange={(value: 'Bronze' | 'Silver' | 'Gold') => setEditingMember(prev => prev ? {...prev, level: value} : null)}>
                                    <SelectTrigger id="level" className="col-span-3">
                                        <SelectValue placeholder="Pilih tingkatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bronze">Bronze</SelectItem>
                                        <SelectItem value="Silver">Silver</SelectItem>
                                        <SelectItem value="Gold">Gold</SelectItem>
                                    </SelectContent>
                                </Select>
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
                    <CardDescription>Kelola pelanggan setia Anda.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>Kontak</TableHead>
                                <TableHead className="text-center">Tingkatan</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((member) => (
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
                                         <Badge variant={member.level === 'Gold' ? 'default' : member.level === 'Silver' ? 'secondary' : 'outline'}
                                           className={member.level === 'Gold' ? 'bg-yellow-500 text-black' : member.level === 'Silver' ? 'bg-slate-400 text-white' : ''}
                                         >{member.level}</Badge>
                                    </TableCell>
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
