
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type Expense = {
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
};

type ExpenseCategory = "Sewa" | "Gaji" | "Utilitas" | "Pemasaran" | "Perlengkapan" | "Lainnya";


const initialExpenseHistory: Expense[] = [
    { id: "EXP001", date: "2023-10-25", category: "Utilitas", description: "Tagihan listrik bulanan", amount: 120500 },
    { id: "EXP002", date: "2023-10-20", category: "Sewa", description: "Sewa toko untuk November", amount: 1500000 },
    { id: "EXP003", date: "2023-10-18", category: "Perlengkapan", description: "Perlengkapan kebersihan", amount: 45200 },
    { id: "EXP004", date: "2023-10-15", category: "Gaji", description: "Gaji untuk Alice (1-15 Okt)", amount: 800000 },
    { id: "EXP005", date: "2023-10-12", category: "Pemasaran", description: "Kampanye iklan media sosial", amount: 250000 },
];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ExpensesPage() {
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenseHistory);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const emptyExpense = { id: "", date: new Date().toISOString().substring(0, 10), category: "", description: "", amount: 0 };

    const handleOpenDialog = (expense: Expense | null = null) => {
        setEditingExpense(expense ? { ...expense } : emptyExpense);
        setDialogOpen(true);
    };

    const handleSaveExpense = () => {
        if (!editingExpense || !editingExpense.category || !editingExpense.amount || !editingExpense.description) {
            toast({ variant: "destructive", title: "Error", description: "Harap isi semua field yang wajib." });
            return;
        }

        if (editingExpense.id) {
            // Update existing expense
            setExpenses(expenses.map(exp => exp.id === editingExpense.id ? editingExpense : exp));
            toast({ title: "Sukses", description: "Beban berhasil diperbarui." });
        } else {
            // Add new expense
            const newExpense = { ...editingExpense, id: `EXP${(expenses.length + 1).toString().padStart(3, '0')}` };
            setExpenses(prev => [...prev, newExpense]);
            toast({ title: "Sukses", description: "Beban baru berhasil ditambahkan." });
        }
        setDialogOpen(false);
        setEditingExpense(null);
    };
    
    const handleDeleteExpense = (id: string) => {
        setExpenses(expenses.filter(exp => exp.id !== id));
        toast({ title: "Sukses", description: "Beban berhasil dihapus." });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Manajemen Beban</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Beban Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline">{editingExpense?.id ? 'Ubah Beban' : 'Tambah Beban Baru'}</DialogTitle>
                            <DialogDescription>
                                {editingExpense?.id ? 'Ubah detail beban yang sudah ada.' : 'Catat beban bisnis baru.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">Tanggal</Label>
                                <Input id="date" type="date" className="col-span-3" value={editingExpense?.date || ''} onChange={(e) => setEditingExpense(prev => prev ? {...prev, date: e.target.value} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Kategori</Label>
                                <Select value={editingExpense?.category} onValueChange={(value: ExpenseCategory) => setEditingExpense(prev => prev ? {...prev, category: value} : null)}>
                                    <SelectTrigger id="category" className="col-span-3">
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sewa">Sewa</SelectItem>
                                        <SelectItem value="Gaji">Gaji</SelectItem>
                                        <SelectItem value="Utilitas">Utilitas</SelectItem>
                                        <SelectItem value="Pemasaran">Pemasaran</SelectItem>
                                        <SelectItem value="Perlengkapan">Perlengkapan</SelectItem>
                                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">Jumlah</Label>
                                <Input id="amount" type="number" placeholder="Rp 0" className="col-span-3" value={editingExpense?.amount || ''} onChange={(e) => setEditingExpense(prev => prev ? {...prev, amount: parseFloat(e.target.value)} : null)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">Deskripsi</Label>
                                <Input id="description" placeholder="contoh: Tagihan listrik bulanan" className="col-span-3" value={editingExpense?.description || ''} onChange={(e) => setEditingExpense(prev => prev ? {...prev, description: e.target.value} : null)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveExpense} type="submit">Simpan Beban</Button>
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
                            {expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>
                                        <div className="font-medium">{expense.date}</div>
                                        <div className="text-sm text-muted-foreground">{expense.id}</div>
                                    </TableCell>
                                    <TableCell>{expense.category}</TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                    <TableCell>
                                       <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Buka menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenDialog(expense)}>Ubah</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteExpense(expense.id)}>Hapus</DropdownMenuItem>
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

    