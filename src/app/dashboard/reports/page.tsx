
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportControls } from "@/components/report-controls";
import { Separator } from "@/components/ui/separator";

// --- SIMULASI DATA ---
// Data ini diselaraskan dengan data dari halaman lain untuk konsistensi.

// 1. Data Penjualan (Sales/Transactions) - Mensimulasikan beberapa transaksi dari POS
const salesData = [
  { id: "TRX001", date: "2024-07-28", item: "Ocean Breeze", revenue: 79990, cogs: 32000 },
  { id: "TRX002", date: "2024-07-28", item: "Isi Ulang: YSL Black Opium (50ml)", revenue: 90000, cogs: 40000 },
  { id: "TRX003", date: "2024-07-29", item: "Mystic Woods", revenue: 85000, cogs: 35000 },
  { id: "TRX004", date: "2024-07-30", item: "Isi Ulang: Sandalwood Supreme (30ml)", revenue: 50000, cogs: 21000 },
  { id: "TRX005", date: "2024-07-30", item: "Parfum Mini", revenue: 25000, cogs: 10000 },
];

// 2. Data Beban (Expenses) - Data ini harus konsisten dengan data awal di halaman Beban
const expenseData = [
    { id: "EXP001", date: "2023-10-25", category: "Utilitas", description: "Tagihan listrik bulanan", amount: 120500 },
    { id: "EXP002", date: "2023-10-20", category: "Sewa", description: "Sewa toko untuk November", amount: 1500000 },
    { id: "EXP003", date: "2023-10-18", category: "Perlengkapan", description: "Perlengkapan kebersihan", amount: 45200 },
    { id: "EXP004", date: "2023-10-15", category: "Gaji", description: "Gaji untuk Alice (1-15 Okt)", amount: 800000 },
    { id: "EXP005", date: "2023-10-12", category: "Pemasaran", description: "Kampanye iklan media sosial", amount: 250000 },
];

// --- FUNGSI HELPER ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export default function ReportsPage() {
  // --- KALKULASI DINAMIS ---
  const totalRevenue = salesData.reduce((sum, sale) => sum + sale.revenue, 0);
  const totalCogs = salesData.reduce((sum, sale) => sum + sale.cogs, 0);
  const grossProfit = totalRevenue - totalCogs;

  const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Data untuk di-export
  const exportData = [
    { Laporan: "Pendapatan", Jumlah: totalRevenue },
    { Laporan: "Harga Pokok Penjualan (HPP)", Jumlah: totalCogs },
    { Laporan: "Laba Kotor", Jumlah: grossProfit },
    { Laporan: "Total Beban Operasional", Jumlah: totalExpenses },
    { Laporan: "Laba Bersih", Jumlah: netProfit },
  ]


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-headline text-3xl font-bold">Laporan Laba Rugi</h1>
        <ReportControls data={exportData} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Laba Rugi</CardTitle>
          <CardDescription>
            Ringkasan keuangan terperinci untuk periode yang dipilih.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Laba Kotor */}
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

            {/* Laba Bersih */}
            <div className="space-y-2">
                <div className="flex justify-between items-baseline font-medium">
                     <span>Beban Operasional</span>
                </div>
                {expenseData.map(expense => (
                    <div key={expense.id} className="flex justify-between items-baseline text-sm text-muted-foreground">
                        <span>{expense.description} ({expense.category})</span>
                        <span>- {formatCurrency(expense.amount)}</span>
                    </div>
                ))}
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Pendapatan</TableHead>
                            <TableHead className="text-right">HPP</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {salesData.map(sale => (
                            <TableRow key={sale.id}>
                                <TableCell>{sale.item}</TableCell>
                                <TableCell className="text-right">{formatCurrency(sale.revenue)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(sale.cogs)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Rincian Beban</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Deskripsi</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenseData.map(expense => (
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
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
