import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CircleDollarSign } from "lucide-react";
import { ProfitLossChart } from "@/components/profit-loss-chart";
import { ReportControls } from "@/components/report-controls";

const profitLossData = [
  { name: 'Jan', revenue: 4000, cogs: 2400, profit: 1600 },
  { name: 'Feb', revenue: 3000, cogs: 1398, profit: 1602 },
  { name: 'Mar', revenue: 5000, cogs: 3800, profit: 1200 },
  { name: 'Apr', revenue: 4780, cogs: 2908, profit: 1872 },
  { name: 'Mei', revenue: 5890, cogs: 3800, profit: 2090 },
  { name: 'Jun', revenue: 4390, cogs: 3100, profit: 1290 },
  { name: 'Jul', revenue: 5490, cogs: 3490, profit: 2000 },
];

const summaryData = [
    { title: "Total Pendapatan", value: "Rp 250.120.890", icon: TrendingUp, color: "text-green-500" },
    { title: "Harga Pokok Penjualan", value: "Rp 142.345.120", icon: TrendingDown, color: "text-red-500" },
    { title: "Laba Bersih", value: "Rp 107.775.770", icon: CircleDollarSign, color: "text-primary" },
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-headline text-3xl font-bold">Laporan Laba & Rugi</h1>
        <ReportControls data={profitLossData} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
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
