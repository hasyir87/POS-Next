import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Package, Users, Activity } from "lucide-react";
import { SalesChart } from "@/components/sales-chart";

const kpiData = [
  { title: "Today's Revenue", value: "$1,482.50", change: "+12.1% from yesterday", icon: DollarSign },
  { title: "Today's Sales", value: "+89", change: "+25 from yesterday", icon: Package },
  { title: "New Customers", value: "+12", change: "+5 since last week", icon: Users },
  { title: "Shift Cash Balance", value: "$345.00", change: "Started at $150.00", icon: Activity },
];

const salesData = [
  { name: "Mon", sales: 4000 },
  { name: "Tue", sales: 3000 },
  { name: "Wed", sales: 2000 },
  { name: "Thu", sales: 2780 },
  { name: "Fri", sales: 1890 },
  { name: "Sat", sales: 2390 },
  { name: "Sun", sales: 3490 },
];

const recentTransactions = [
  { id: "TRX001", customer: "Olivia Martin", amount: "$45.00", item: "Custom Blend (Floral)", status: "Paid" },
  { id: "TRX002", customer: "Liam Johnson", amount: "$79.99", item: "Ocean Breeze", status: "Paid" },
  { id: "TRX003", customer: "Noah Williams", amount: "$25.50", item: "Mystic Woods", status: "Paid" },
  { id: "TRX004", customer: "Emma Brown", amount: "$150.00", item: "Bulk Order", status: "Pending" },
  { id: "TRX005", customer: "Ava Jones", amount: "$60.25", item: "Custom Blend (Citrus)", status: "Paid" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-bold">Dashboard</h1>
      
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
            <CardTitle>Sales Performance</CardTitle>
            <CardDescription>This week's sales compared to last week.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart data={salesData} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>A list of the most recent sales.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
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
