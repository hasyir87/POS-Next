
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package, Users, ShoppingCart, TrendingUp, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SalesChart } from '@/components/sales-chart';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Droplets, Trophy } from 'lucide-react';
import Link from 'next/link';

// This is a placeholder. In a real app, this data would come from the API.
const salesData = [
  { name: "Sen", sales: 4000 },
  { name: "Sel", sales: 3000 },
  { name: "Rab", sales: 2000 },
  { name: "Kam", sales: 2780 },
  { name: "Jum", sales: 1890 },
  { name: "Sab", sales: 2390 },
  { name: "Min", sales: 3490 },
];

const topProducts = [
    { rank: 1, name: "Ocean Breeze", sales: 124 },
    { rank: 2, name: "Mystic Woods", sales: 98 },
    { rank: 3, name: "Citrus Grove", sales: 76 },
];

const topRefillAromas = [
    { rank: 1, aroma: "YSL Black Opium", sales: 88 },
    { rank: 2, aroma: "Baccarat Rouge", sales: 81 },
    { rank: 3, aroma: "Creed Aventus", sales: 65 },
];


export default function DashboardPage() {
  const { user, selectedOrganizationId, loading: authLoading, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && selectedOrganizationId) {
      setLoading(false);
    }
  }, [user, authLoading, selectedOrganizationId]);


  if (authLoading || (!profile && !loading)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )
    }

    if (!selectedOrganizationId) {
        return <p>Pilih outlet untuk melihat data.</p>
    }

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 0</div>
              <p className="text-xs text-muted-foreground">Data belum tersedia</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Performa Penjualan</CardTitle>
                <CardDescription>Penjualan minggu ini.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <SalesChart data={salesData} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Notifikasi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">Tidak ada notifikasi baru.</p>
              </CardContent>
            </Card>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500" /> Produk Jadi Terlaris</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Peringkat</TableHead><TableHead>Produk</TableHead><TableHead className="text-right">Penjualan</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {topProducts.map(p => <TableRow key={p.rank}><TableCell>{p.rank}</TableCell><TableCell>{p.name}</TableCell><TableCell className="text-right">{p.sales} unit</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Droplets className="text-blue-500" /> Aroma Isi Ulang Terpopuler</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Peringkat</TableHead><TableHead>Aroma</TableHead><TableHead className="text-right">Penjualan</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {topRefillAromas.map(a => <TableRow key={a.rank}><TableCell>{a.rank}</TableCell><TableCell>{a.aroma}</TableCell><TableCell className="text-right">{a.sales} kali</TableCell></TableRow>)}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Dasbor</h1>
      </div>
      {renderContent()}
    </div>
  );
}
