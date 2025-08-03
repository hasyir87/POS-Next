
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Permission = {
    id: string;
    label: string;
    category: string;
};

type Role = {
    name: string;
    description: string;
    permissions: string[];
};

const allPermissions: Permission[] = [
    { id: "dashboard.view", label: "Lihat Dasbor", category: "Dasbor" },
    { id: "dashboard.view.alloutlets", label: "Lihat Semua Outlet", category: "Dasbor" },
    { id: "reports.view", label: "Lihat Laporan", category: "Laporan" },
    { id: "reports.export", label: "Ekspor Laporan", category: "Laporan" },
    
    { id: "transactions.create", label: "Buat Transaksi", category: "Penjualan" },
    { id: "transactions.view", label: "Lihat Transaksi", category: "Penjualan" },

    { id: "inventory.view", label: "Lihat Inventaris", category: "Inventaris" },
    { id: "inventory.manage", label: "Kelola Inventaris", category: "Inventaris" },
    { id: "inventory.ai", label: "Gunakan AI Mixologist", category: "Inventaris" },

    { id: "shifts.manage", label: "Kelola Semua Shift", category: "Shift" },
    { id: "shifts.own.manage", label: "Kelola Shift Sendiri", category: "Shift" },

    { id: "users.manage", label: "Kelola Pengguna", category: "Pengaturan" },
    { id: "roles.manage", label: "Kelola Peran", category: "Pengaturan" },
    { id: "settings.manage", label: "Kelola Pengaturan Aplikasi", category: "Pengaturan" },
];

const initialRoles: Role[] = [
  {
    name: "Pemilik",
    description: "Memiliki semua izin dan akses ke semua outlet.",
    permissions: allPermissions.map(p => p.id),
  },
  {
    name: "Admin",
    description: "Mengelola operasi harian untuk satu outlet.",
    permissions: [
      "dashboard.view", "reports.view", "reports.export", "transactions.view", "inventory.view",
      "inventory.manage", "inventory.ai", "shifts.manage", "users.manage",
    ],
  },
  {
    name: "Kasir",
    description: "Menangani transaksi penjualan untuk satu outlet.",
    permissions: ["transactions.create", "shifts.own.manage"],
  },
  {
    name: "Klien API",
    description: "Untuk layanan backend seperti POS Flutter.",
    permissions: ["transactions.create", "inventory.view"],
  },
];

const permissionCategories = ["Dasbor", "Laporan", "Penjualan", "Inventaris", "Shift", "Pengaturan"];

export default function RolesPage() {
    const { toast } = useToast();
    const [roles, setRoles] = useState<Role[]>(initialRoles);

    const handlePermissionChange = (roleName: string, permissionId: string, checked: boolean) => {
        setRoles(roles.map(role => {
            if (role.name === roleName) {
                const newPermissions = checked
                    ? [...role.permissions, permissionId]
                    : role.permissions.filter(p => p !== permissionId);
                return { ...role, permissions: newPermissions };
            }
            return role;
        }));
    };

    const handleSaveChanges = () => {
        toast({
            title: "Perubahan Disimpan",
            description: "Izin peran telah berhasil diperbarui.",
        });
        // In a real app, you'd send this `roles` state to your backend.
        console.log("Saving roles:", roles);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Manajemen Peran</h1>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Peran Baru
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Peran & Izin</CardTitle>
                    <CardDescription>Tentukan apa yang dapat diakses dan dilakukan setiap peran dalam aplikasi dan API.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Peran</TableHead>
                                    {permissionCategories.map(cat => (
                                        <TableHead key={cat}>{cat}</TableHead>
                                    ))}
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.map((role) => (
                                    <TableRow key={role.name}>
                                        <TableCell className="font-medium align-top">
                                            <div>{role.name}</div>
                                            <div className="text-xs text-muted-foreground font-normal">{role.description}</div>
                                        </TableCell>
                                        {permissionCategories.map(cat => (
                                            <TableCell key={cat} className="align-top">
                                                <div className="flex flex-col gap-2">
                                                    {allPermissions.filter(p => p.category === cat).map((permission) => (
                                                        <div key={permission.id} className="flex items-center gap-2">
                                                            <Checkbox 
                                                                id={`${role.name}-${permission.id}`} 
                                                                checked={role.permissions.includes(permission.id)}
                                                                disabled={role.name === 'Pemilik'}
                                                                onCheckedChange={(checked) => handlePermissionChange(role.name, permission.id, !!checked)}
                                                            />
                                                            <Label htmlFor={`${role.name}-${permission.id}`} className="font-normal text-sm">{permission.label}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        ))}
                                        <TableCell className="align-top">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={role.name === 'Pemilik'}>
                                                        <span className="sr-only">Buka menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>Ubah</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">Hapus</DropdownMenuItem>
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
            <div className="flex justify-end">
                <Button onClick={handleSaveChanges}>Simpan Perubahan</Button>
            </div>
        </div>
    );
}

    