
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CircleDollarSign, Archive } from "lucide-react";
import { ProfitLossChart } from "@/components/profit-loss-chart";
import { ReportControls } from "@/components/report-controls";

// In a real app, this data would be fetched and calculated dynamically
const profitLossData = [
  { name: 'Jan', revenue: 4000000, cogs: 2400000, profit: 1600000 },
  { name: 'Feb', revenue: 3000000, cogs: 1398000, profit: 1602000 },
  { name: 'Mar', revenue: 5000000, cogs: 3800000, profit: 1200000 },
  { name: 'Apr', revenue: 4780000, cogs: 2908000, profit: 1872000 },
  { name: 'Mei', revenue: 5890000, cogs: 3800000, profit: 2090000 },
  { name: 'Jun', revenue: 4390000, cogs: 3100000, profit: 1290000 },
  { name: 'Jul', revenue: 5490000, cogs: 3490000, profit: 2000000 },
];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// This would also be fetched in a real app
const initialInventoryValue = 18382500; // Calculated from initial inventory data for demonstration

export default function ReportsPage() {
  // In a real app, you would fetch inventory and calculate this value
  const [totalInventoryValue, setTotalInventoryValue] = useState(initialInventoryValue);
  
  const summaryData = [
      { title: "Total Pendapatan", value: formatCurrency(250120890), icon: TrendingUp, color: "text-green-500" },
      { title: "Harga Pokok Penjualan (HPP)", value: formatCurrency(142345120), icon: TrendingDown, color: "text-red-500" },
      { title: "Laba Bersih", value: formatCurrency(107775770), icon: CircleDollarSign, color: "text-primary" },
      { title: "Total Nilai Inventaris", value: formatCurrency(totalInventoryValue), icon: Archive, color: "text-blue-500" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-headline text-3xl font-bold">Laporan Laba & Rugi</h1>
        <ReportControls data={profitLossData} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryData.map((item, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                    <item.icon className={`h-4 w-4 text-muted-foreground ${item.color}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{item.value}</div>
                    <p className="text-xs text-muted-foreground">Tahun berjalan</p>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kinerja Bulanan</CardTitle>
          <CardDescription>Pendapatan vs. Harga Pokok Penjualan (HPP) dari waktu ke waktu.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfitLossChart data={profitLossData} />
        </CardContent>
      </Card>
    </div>
  );
}
