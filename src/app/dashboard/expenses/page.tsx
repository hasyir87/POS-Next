import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const expenseHistory = [
    { id: "EXP001", date: "2023-10-25", category: "Utilitas", description: "Tagihan listrik bulanan", amount: "Rp 120.500" },
    { id: "EXP002", date: "2023-10-20", category: "Sewa", description: "Sewa toko untuk November", amount: "Rp 1.500.000" },
    { id: "EXP003", date: "2023-10-18", category: "Perlengkapan", description: "Perlengkapan kebersihan", amount: "Rp 45.200" },
    { id: "EXP004", date: "2023-10-15", category: "Gaji", description: "Gaji untuk Alice (1-15 Okt)", amount: "Rp 800.000" },
    { id: "EXP005", date: "2023-10-12", category: "Pemasaran", description: "Kampanye iklan media sosial", amount: "Rp 250.000" },
];

export default function ExpensesPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Manajemen Beban</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Beban Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline">Tambah Beban Baru</DialogTitle>
                            <DialogDescription>
                                Catat beban bisnis baru.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">Tanggal</Label>
                                <Input id="date" type="date" className="col-span-3" defaultValue={new Date().toISOString().substring(0, 10)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Kategori</Label>
                                <Select>
                                    <SelectTrigger id="category" className="col-span-3">
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rent">Sewa</SelectItem>
                                        <SelectItem value="payroll">Gaji</SelectItem>
                                        <SelectItem value="utilities">Utilitas</SelectItem>
                                        <SelectItem value="marketing">Pemasaran</SelectItem>
                                        <SelectItem value="supplies">Perlengkapan</SelectItem>
                                        <SelectItem value="other">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Jumlah</Label>
                                <Input id="amount" type="number" placeholder="Rp 0" className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Deskripsi</Label>
                                <Input id="description" placeholder="contoh: Tagihan listrik bulanan" className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Simpan Beban</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Beban</CardTitle>
                    <CardDescription>Catatan semua beban bisnis yang tercatat.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenseHistory.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>
                                        <div className="font-medium">{expense.date}</div>
                                        <div className="text-sm text-muted-foreground">{expense.id}</div>
                                    </TableCell>
                                    <TableCell>{expense.category}</TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell className="text-right">{expense.amount}</TableCell>
                                    <TableCell>
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
