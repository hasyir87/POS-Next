
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Package, Users, Activity, AlertCircle, ArchiveX } from "lucide-react";
import { SalesChart } from "@/components/sales-chart";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const kpiData = [
  { title: "Pendapatan Hari Ini", value: "Rp 2.150.000", change: "+12.1% dari kemarin", icon: DollarSign },
  { title: "Penjualan Hari Ini", value: "+89", change: "+25 dari kemarin", icon: Package },
  { title: "Pelanggan Baru", value: "+12", change: "+5 sejak minggu lalu", icon: Users },
  { title: "Saldo Kas Shift", value: "Rp 345.000", change: "Dimulai dari Rp 150.000", icon: Activity },
];

const salesData = [
  { name: "Sen", sales: 4000 },
  { name: "Sel", sales: 3000 },
  { name: "Rab", sales: 2000 },
  { name: "Kam", sales: 2780 },
  { name: "Jum", sales: 1890 },
  { name: "Sab", sales: 2390 },
  { name: "Min", sales: 3490 },
];

const recentTransactions = [
  { id: "TRX001", customer: "Olivia Martin", amount: "Rp 45.000", item: "Custom Blend (Floral)", status: "Paid" },
  { id: "TRX002", customer: "Liam Johnson", amount: "Rp 79.990", item: "Ocean Breeze", status: "Paid" },
  { id: "TRX003", customer: "Noah Williams", amount: "Rp 25.500", item: "Mystic Woods", status: "Paid" },
  { id: "TRX004", customer: "Emma Brown", amount: "Rp 150.000", item: "Bulk Order", status: "Pending" },
  { id: "TRX005", customer: "Ava Jones", amount: "Rp 60.250", item: "Custom Blend (Citrus)", status: "Paid" },
];

type Material = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

// --- SIMULASI DATA ---
// Data ini disinkronkan dengan data awal di halaman Inventaris untuk konsistensi notifikasi.
const initialAvailableMaterials: Material[] = [
  { id: "MAT001", name: "Rose Absolute", quantity: 50, unit: "ml" },
  { id: "MAT002", name: "Jasmine Sambac", quantity: 350, unit: "ml" },
  { id: "MAT003", name: "Bergamot Oil", quantity: 1200, unit: "ml" },
  { id: "MAT004", name: "Sandalwood", quantity: 0, unit: "g" },
  { id: "MAT005", name: "Vanilla Extract", quantity: 800, unit: "ml" },
  { id: "MAT006", name: "Ethanol (Perfumer's Alcohol)", quantity: 5000, unit: "ml" },
  { id: "MAT007", name: "Iso E Super", quantity: 180, unit: "ml" },
  { id: "MAT008", name: "Ambroxan", quantity: 150, unit: "g" },
  { id: "MAT009", name: "Botol Kaca 50ml", quantity: 150, unit: "pcs" },
  { id: "MAT010", name: "Botol Kaca 100ml", quantity: 80, unit: "pcs" },
];


export default function DashboardPage() {
    // In a real app, this would be fetched or come from a global state
    const [materials, setMaterials] = useState<Material[]>(initialAvailableMaterials);
    // Nilai ini harus cocok dengan nilai default di halaman Pengaturan
    const [lowStockThreshold, setLowStockThreshold] = useState(200);

    const lowStockItems = materials.filter(m => m.quantity > 0 && m.quantity < lowStockThreshold);
    const outOfStockItems = materials.filter(m => m.quantity === 0);
    const notifications = [...outOfStockItems, ...lowStockItems];


  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-bold">Dasbor</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performa Penjualan</CardTitle>
                <CardDescription>Penjualan minggu ini dibandingkan minggu lalu.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <SalesChart data={salesData} />
              </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Pemberitahuan & Tugas</CardTitle>
                    <CardDescription>Item yang memerlukan perhatian segera.</CardDescription>
                </CardHeader>
                <CardContent>
                    {notifications.length > 0 ? (
                        <ul className="space-y-3">
                            {outOfStockItems.map(item => (
                                <li key={item.id} className="flex items-start gap-3">
                                    <ArchiveX className="h-5 w-5 text-red-500 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium leading-tight">Stok Habis: {item.name}</p>
                                        <p className="text-sm text-muted-foreground">Segera lakukan pemesanan ulang.</p>
                                    </div>
                                    <Button asChild variant="secondary" size="sm"><Link href="/dashboard/inventory">Lihat</Link></Button>
                                </li>
                            ))}
                            {lowStockItems.map(item => (
                                <li key={item.id} className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium leading-tight">Stok Menipis: {item.name}</p>
                                        <p className="text-sm text-muted-foreground">Sisa {item.quantity} {item.unit}. Pertimbangkan untuk memesan ulang.</p>
                                    </div>
                                     <Button asChild variant="secondary" size="sm"><Link href="/dashboard/inventory">Lihat</Link></Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                       <div className="text-center text-muted-foreground py-4">
                         <p>Tidak ada pemberitahuan. Semuanya baik-baik saja!</p>
                       </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Transaksi Terkini</CardTitle>
            <CardDescription>Daftar penjualan terbaru.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((trx) => (
                  <TableRow key={trx.id}>
                    <TableCell>
                      <div className="font-medium">{trx.customer}</div>
                      <div className="text-sm text-muted-foreground">{trx.id}</div>
                    </TableCell>
                    <TableCell>{trx.item}</TableCell>
                    <TableCell className="text-right">{trx.amount}</TableCell>
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

    