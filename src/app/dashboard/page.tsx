import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Package, Users, Activity } from "lucide-react";
import { SalesChart } from "@/components/sales-chart";

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

export default function DashboardPage() {
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
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Performa Penjualan</CardTitle>
            <CardDescription>Penjualan minggu ini dibandingkan minggu lalu.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart data={salesData} />
          </CardContent>
        </Card>
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
