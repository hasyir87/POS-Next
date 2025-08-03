import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, User, Languages, Key, Store, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


export default function SettingsPage() {
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
                             <Button>Buat Kunci Baru</Button>
                         </div>
                         <Separator className="my-4" />
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Label</TableHead>
                                     <TableHead>Kunci (8 Karakter Pertama)</TableHead>
                                     <TableHead>Dibuat</TableHead>
                                     <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 <TableRow>
                                     <TableCell className="font-medium">Aplikasi POS Flutter</TableCell>
                                     <TableCell className="font-mono">sk_live_Abc123De...</TableCell>
                                     <TableCell>29 Oktober 2023</TableCell>
                                     <TableCell className="text-right">
                                         <Button variant="destructive" size="sm">Cabut</Button>
                                     </TableCell>
                                 </TableRow>
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
                             <Button>Tambah Outlet Baru</Button>
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
                                 <TableRow>
                                     <TableCell className="font-medium">ScentPOS - Jakarta Pusat</TableCell>
                                     <TableCell>Jakarta</TableCell>
                                     <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
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
                                  <TableRow>
                                     <TableCell className="font-medium">ScentPOS - Bandung</TableCell>
                                     <TableCell>Bandung</TableCell>
                                     <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
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
