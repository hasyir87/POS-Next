
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, DollarSign, Loader2, Package, TrendingUp, Users } from 'lucide-react';
import { SalesChart } from '@/components/sales-chart';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Droplets, Trophy } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/types/database';

// Helper function to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

interface DashboardData {
    dailyRevenue: number;
    dailySalesCount: number;
    newCustomersToday: number;
    topProducts: Array<{ name: string | null, sales: number | null }>;
}

export default function DashboardPage() {
  const { loading: authLoading, profile, selectedOrganizationId, supabase } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!selectedOrganizationId || !supabase) {
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
        const { data, error } = await supabase.rpc('get_dashboard_analytics', {
            p_organization_id: selectedOrganizationId
        });

        if (error) {
            throw error;
        }

        setDashboardData({
            dailyRevenue: data[0].daily_revenue || 0,
            dailySalesCount: data[0].daily_sales_count || 0,
            newCustomersToday: data[0].new_customers_today || 0,
            topProducts: data[0].top_selling_products || [],
        });

    } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("Gagal memuat data dasbor. Silakan coba lagi.");
    } finally {
        setIsLoading(false);
    }
  }, [selectedOrganizationId, supabase]);

  useEffect(() => {
    if (!authLoading && selectedOrganizationId) {
      fetchDashboardData();
    } else if (!authLoading && !selectedOrganizationId) {
      setIsLoading(false);
    }
  }, [authLoading, selectedOrganizationId, fetchDashboardData]);
  
  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedOrganizationId) {
    return (
      <Card className="m-auto">
        <CardHeader>
          <CardTitle>Selamat Datang!</CardTitle>
          <CardDescription>
            Untuk memulai, silakan pilih outlet atau organisasi dari menu dropdown di bagian atas halaman ini.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
   if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Terjadi Kesalahan</AlertTitle>
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }


  // Main dashboard content
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Dasbor</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardData?.dailyRevenue || 0)}</div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{dashboardData?.dailySalesCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pelanggan Baru (Hari Ini)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{dashboardData?.newCustomersToday || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Grafik Penjualan</CardTitle>
                <CardDescription>Data belum tersedia.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                 <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground">
                    Grafik akan ditampilkan di sini
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500" /> Produk Terlaris</CardTitle>
                 <CardDescription>Produk dengan penjualan unit terbanyak.</CardDescription>
              </CardHeader>
              <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Peringkat</TableHead><TableHead>Produk</TableHead><TableHead className="text-right">Penjualan</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                                dashboardData.topProducts.map((p, index) => <TableRow key={index}><TableCell>{index + 1}</TableCell><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.sales} unit</TableCell></TableRow>)
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center">Belum ada data penjualan.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
              </CardContent>
            </Card>
        </div>
    </div>
  );
}

