
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { getFirestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportControls } from "@/components/report-controls";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interface untuk data dari Firestore
interface Transaction {
  id: string;
  created_at: Timestamp;
  items: { name: string; price: number; quantity: number, type: 'product' | 'refill' }[];
  total_amount: number;
  organization_id: string;
}

interface Expense {
    id: string;
    date: string;
    category: string;
    description: string;
    amount: number;
    organization_id: string;
}

// --- FUNGSI HELPER ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ReportsPage() {
  const { selectedOrganizationId, loading: authLoading } = useAuth();
  const db = getFirestore(firebaseApp);
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hardcoded COGS, karena tidak ada data harga beli di transaksi
  const COGS_PERCENTAGE = 0.4; // Asumsi HPP adalah 40% dari pendapatan

  const fetchData = useCallback(async () => {
    if (!selectedOrganizationId) {
      setIsLoading(false);
      setTransactions([]);
      setExpenses([]);
      return;
    }
    setIsLoading(true);
    try {
      const transactionsQuery = query(collection(db, "transactions"), where("organization_id", "==", selectedOrganizationId));
      const expensesQuery = query(collection(db, "expenses"), where("organization_id", "==", selectedOrganizationId));

      const [transactionsSnapshot, expensesSnapshot] = await Promise.all([
        getDocs(transactionsQuery),
        getDocs(expensesQuery)
      ]);

      const transactionsData = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));

      setTransactions(transactionsData);
      setExpenses(expensesData);

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: `Gagal memuat data laporan: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrganizationId, db, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [selectedOrganizationId, authLoading, fetchData]);


  // --- KALKULASI DINAMIS ---
  const totalRevenue = transactions.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalCogs = totalRevenue * COGS_PERCENTAGE; // Estimasi HPP
  const grossProfit = totalRevenue - totalCogs;

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Data untuk di-export
  const exportData = [
    { Laporan: "Pendapatan", Jumlah: totalRevenue },
    { Laporan: "Harga Pokok Penjualan (HPP)", Jumlah: totalCogs },
    { Laporan: "Laba Kotor", Jumlah: grossProfit },
    { Laporan: "Total Beban Operasional", Jumlah: totalExpenses },
    { Laporan: "Laba Bersih", Jumlah: netProfit },
  ];

  if (authLoading) {
    return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-headline text-3xl font-bold">Laporan Laba Rugi</h1>
        <ReportControls data={exportData} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : !selectedOrganizationId ? (
        <Card><CardHeader><CardTitle>Pilih Outlet</CardTitle><CardDescription>Pilih outlet dari menu di atas untuk melihat laporan.</CardDescription></CardHeader></Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Laba Rugi</CardTitle>
              <CardDescription>
                Ringkasan keuangan terperinci untuk periode yang dipilih.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <span className="font-medium">Pendapatan</span>
                        <span>{formatCurrency(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-baseline text-sm text-muted-foreground">
                        <span>Harga Pokok Penjualan (HPP)</span>
                        <span>- {formatCurrency(totalCogs)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-baseline font-semibold text-lg">
                        <span>Laba Kotor</span>
                        <span>{formatCurrency(grossProfit)}</span>
                    </div>
                </div>

                <Separator className="my-6"/>

                <div className="space-y-2">
                    <div className="flex justify-between items-baseline font-medium">
                        <span>Beban Operasional</span>
                    </div>
                    {expenses.length > 0 ? expenses.map(expense => (
                        <div key={expense.id} className="flex justify-between items-baseline text-sm text-muted-foreground">
                            <span>{expense.description} ({expense.category})</span>
                            <span>- {formatCurrency(expense.amount)}</span>
                        </div>
                    )) : <p className="text-sm text-muted-foreground">Tidak ada beban tercatat.</p>}
                    <Separator />
                    <div className="flex justify-between items-baseline font-semibold">
                        <span>Total Beban Operasional</span>
                        <span>- {formatCurrency(totalExpenses)}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-secondary/50">
                <div className="flex justify-between items-baseline w-full font-bold text-xl">
                    <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>Laba Bersih</span>
                    <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(netProfit)}</span>
                </div>
            </CardFooter>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Rincian Penjualan</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Pendapatan</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {transactions.flatMap(tx => tx.items.map((item, index) => (
                                    <TableRow key={`${tx.id}-${index}`}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                    </TableRow>
                                )))}
                            </TableBody>
                        </Table>
                    ) : <p className="text-sm text-center text-muted-foreground">Tidak ada penjualan tercatat.</p>}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Rincian Beban</CardTitle>
                </CardHeader>
                <CardContent>
                    {expenses.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Deskripsi</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {expenses.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell>
                                            <div className="font-medium">{expense.description}</div>
                                            <div className="text-sm text-muted-foreground">{expense.category}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : <p className="text-sm text-center text-muted-foreground">Tidak ada beban tercatat.</p>}
                </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
