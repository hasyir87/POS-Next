import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, CircleDollarSign } from "lucide-react";

const profitLossData = [
  { name: 'Jan', revenue: 4000, cogs: 2400, profit: 1600 },
  { name: 'Feb', revenue: 3000, cogs: 1398, profit: 1602 },
  { name: 'Mar', revenue: 5000, cogs: 3800, profit: 1200 },
  { name: 'Apr', revenue: 4780, cogs: 2908, profit: 1872 },
  { name: 'May', revenue: 5890, cogs: 3800, profit: 2090 },
  { name: 'Jun', revenue: 4390, cogs: 3100, profit: 1290 },
  { name: 'Jul', revenue: 5490, cogs: 3490, profit: 2000 },
];

const summaryData = [
    { title: "Total Revenue", value: "$250,120.89", icon: TrendingUp, color: "text-green-500" },
    { title: "Cost of Goods Sold", value: "$142,345.12", icon: TrendingDown, color: "text-red-500" },
    { title: "Net Profit", value: "$107,775.77", icon: CircleDollarSign, color: "text-primary" },
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-bold">Profit & Loss Report</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        {summaryData.map((item, index) => (
            <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                    <item.icon className={`h-4 w-4 text-muted-foreground ${item.color}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{item.value}</div>
                    <p className="text-xs text-muted-foreground">Year to date</p>
                </CardContent>
            </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>Revenue vs. Cost of Goods Sold (COGS) over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={profitLossData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="cogs" name="COGS" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorCogs)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
