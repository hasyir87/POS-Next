
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, DollarSign, Loader2, Package, TrendingUp, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Trophy } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCallback, useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';

const db = getFirestore(firebaseApp);

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

interface DashboardData {
    dailyRevenue: number;
    dailySalesCount: number;
    newCustomersToday: number;
    topProducts: Array<{ name: string; sales: number }>;
}

export default function DashboardPage() {
  const { loading: authLoading, selectedOrganizationId } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!selectedOrganizationId) {
        setIsLoading(false);
        setDashboardData(null);
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = Timestamp.fromDate(today);

        const transactionsQuery = query(
            collection(db, "transactions"),
            where("organization_id", "==", selectedOrganizationId),
            where("created_at", ">=", startOfToday)
        );
        
        const customersQuery = query(
            collection(db, "customers"),
            where("organization_id", "==", selectedOrganizationId),
            where("created_at", ">=", startOfToday)
        );

        const [
            transactionsSnapshot, 
            newCustomersSnapshot, 
        ] = await Promise.all([
            getDocs(transactionsQuery),
            getDocs(customersQuery),
        ]);

        let dailyRevenue = 0;
        transactionsSnapshot.forEach((doc) => {
            dailyRevenue += doc.data().total_amount || 0;
        });

        const dailySalesCount = transactionsSnapshot.size;
        const newCustomersToday = newCustomersSnapshot.size;

        const productSales: { [key: string]: number } = {};
        transactionsSnapshot.forEach(doc => {
            const items = doc.data().items as Array<{ product_id: string, name: string, quantity: number }>;
            if (items) {
                items.forEach(item => {
                    if (item.name) {
                        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
                    }
                });
            }
        });
        
        const topProducts = Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, sales]) => ({ name, sales }));

        setDashboardData({
            dailyRevenue,
            dailySalesCount,
            newCustomersToday,
            topProducts,
        });

    } catch (err: any) {
        console.error("Error fetching dashboard data from client:", err);
        let errorMessage = "Gagal memuat data dasbor. Periksa izin Firestore Anda.";
        if (err.message.includes("requires an index")) {
            errorMessage = "Database memerlukan konfigurasi indeks. Silakan hubungi developer.";
        }
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [selectedOrganizationId]);

  useEffect(() => {
    if (!authLoading && selectedOrganizationId) {
      fetchDashboardData();
    } else if (!authLoading && !selectedOrganizationId) {
      setIsLoading(false);
      setDashboardData(null);
    }
  }, [authLoading, selectedOrganizationId, fetchDashboardData]);
  
  if (authLoading) {
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
  
   if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Dasbor</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                 <CardDescription>Produk dengan penjualan unit terbanyak hari ini.</CardDescription>
              </CardHeader>
              <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Peringkat</TableHead><TableHead>Produk</TableHead><TableHead className="text-right">Penjualan</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                                dashboardData.topProducts.map((p, index) => <TableRow key={index}><TableCell>{index + 1}</TableCell><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.sales} unit</TableCell></TableRow>)
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center">Belum ada data penjualan hari ini.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
              </CardContent>
            </Card>
        </div>
    </div>
  );
}
