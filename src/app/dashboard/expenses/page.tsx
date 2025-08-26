
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getFirestore, collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';

type Expense = {
    id: string;
    organization_id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
};

type ExpenseCategory = "Sewa" | "Gaji" | "Utilitas" | "Pemasaran" | "Perlengkapan" | "Lainnya";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ExpensesPage() {
    const { toast } = useToast();
    const { selectedOrganizationId, loading: authLoading } = useAuth();
    const db = getFirestore(firebaseApp);

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

    const emptyExpense: Partial<Expense> = { date: new Date().toISOString().substring(0, 10), category: "Lainnya", description: "", amount: 0 };

    const fetchExpenses = useCallback(async () => {
        if (!selectedOrganizationId) {
            setExpenses([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const q = query(collection(db, "expenses"), where("organization_id", "==", selectedOrganizationId), orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const expensesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            setExpenses(expensesData);
        } catch (error) {
            console.error("Error fetching expenses: ", error);
            toast({ variant: "destructive", title: "Error", description: "Gagal mengambil data beban." });
            setExpenses([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedOrganizationId, db, toast]);

    useEffect(() => {
        if(!authLoading && selectedOrganizationId) {
          fetchExpenses();
        } else if (!selectedOrganizationId && !authLoading) {
          setIsLoading(false);
          setExpenses([]);
        }
    }, [selectedOrganizationId, authLoading, fetchExpenses]);


    const handleOpenDialog = (expense: Partial<Expense> | null = null) => {
        setEditingExpense(expense ? { ...expense } : emptyExpense);
        setDialogOpen(true);
    };

    const handleSaveExpense = async () => {
        if (!editingExpense || !editingExpense.category || !editingExpense.amount || !editingExpense.description || !selectedOrganizationId) {
            toast({ variant: "destructive", title: "Error", description: "Harap isi semua field yang wajib." });
            return;
        }

        const expenseData = {
            date: editingExpense.date,
            category: editingExpense.category,
            description: editingExpense.description,
            amount: editingExpense.amount,
            organization_id: selectedOrganizationId,
            updated_at: serverTimestamp()
        };

        try {
            if (editingExpense.id) {
                const expenseRef = doc(db, 'expenses', editingExpense.id);
                await updateDoc(expenseRef, expenseData);
                toast({ title: "Sukses", description: "Beban berhasil diperbarui." });
            } else {
                await addDoc(collection(db, 'expenses'), { ...expenseData, created_at: serverTimestamp() });
                toast({ title: "Sukses", description: "Beban baru berhasil ditambahkan." });
            }
            setDialogOpen(false);
            setEditingExpense(null);
            fetchExpenses();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: error.message });
        }
    };
    
    const handleDeleteExpense = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'expenses', id));
            toast({ title: "Sukses", description: "Beban berhasil dihapus." });
            fetchExpenses();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
        }
    };

    if (authLoading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Manajemen Beban</h1>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()} disabled={!selectedOrganizationId}>
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
                                <Input id="amount" type="number" placeholder="Rp 0" className="col-span-3" value={editingExpense?.amount || ''} onChange={(e) => setEditingExpense(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : null)} />
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
                           {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                            ) : !selectedOrganizationId ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Pilih outlet untuk melihat data.</TableCell></TableRow>
                            ) : expenses.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4 text-muted-foreground">Belum ada data beban.</TableCell></TableRow>
                            ) : (
                                expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            <div className="font-medium">{expense.date}</div>
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
