
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Users, ShoppingCart, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  lowStockProducts: number;
  activePromotions: number;
}

interface Promotion {
  id: string;
  name: string;
  type: string;
  value: number;
  is_active: boolean;
}

export default function DashboardPage() {
  const { user, selectedOrganizationId, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    activePromotions: 0
  });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch products
      const productsResponse = await fetch('/api/products');
      const productsData = await productsResponse.json();
      
      // Fetch promotions
      const promotionsResponse = await fetch('/api/promotions');
      let promotionsData = [];
      
      if (promotionsResponse.ok) {
        promotionsData = await promotionsResponse.json();
        console.log('Promotions data received:', promotionsData);
      } else {
        console.warn('Failed to fetch promotions:', promotionsResponse.status);
        promotionsData = [];
      }
      
      // Fetch users
      const usersResponse = await fetch('/api/users');
      const usersData = await usersResponse.json();
      
      // Fetch transactions
      const transactionsResponse = await fetch('/api/transactions');
      const transactionsData = await transactionsResponse.json();

      // Calculate stats
      const products = Array.isArray(productsData) ? productsData : [];
      const activePromotions = Array.isArray(promotionsData) ? promotionsData.filter(p => p.is_active) : [];
      const users = Array.isArray(usersData) ? usersData : [];
      const transactions = Array.isArray(transactionsData) ? transactionsData : [];
      
      const lowStockProducts = products.filter(p => p.stock < 10).length;
      const totalRevenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);

      setStats({
        totalProducts: products.length,
        totalUsers: users.length,
        totalTransactions: transactions.length,
        totalRevenue,
        lowStockProducts,
        activePromotions: activePromotions.length
      });

      setPromotions(activePromotions);
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else if (!user && !loading) {
      // If no user and not loading, redirect to login
      window.location.href = '/';
    }
  }, [user, selectedOrganizationId]);

  const refreshData = () => {
    fetchDashboardData();
  };

  // Check authentication first
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Anda perlu login untuk mengakses dashboard</p>
          <Button onClick={() => window.location.href = '/'}>
            Kembali ke Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        
        <Button onClick={refreshData} className="w-full">
          Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockProducts > 0 && (
                <span className="text-orange-600">
                  {stats.lowStockProducts} stok rendah
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Pengguna aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Transaksi selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {stats.totalRevenue.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Pendapatan kotor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Promotions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Promosi Aktif</CardTitle>
          <CardDescription>
            Daftar promosi yang sedang berjalan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {promotions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada promosi aktif</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/dashboard/promotions'}>
                Buat Promosi Baru
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {promotions.map((promotion) => (
                <div key={promotion.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <h3 className="font-medium">{promotion.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {promotion.type === 'Persentase' ? `${promotion.value}%` : `Rp ${promotion.value.toLocaleString('id-ID')}`}
                    </p>
                  </div>
                  <Badge variant={promotion.is_active ? 'default' : 'secondary'}>
                    {promotion.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
          <CardDescription>
            Akses fitur utama dengan cepat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button onClick={() => window.location.href = '/dashboard/pos'} className="w-full">
              Buka POS
            </Button>
            <Button onClick={() => window.location.href = '/dashboard/products'} variant="outline" className="w-full">
              Kelola Produk
            </Button>
            <Button onClick={() => window.location.href = '/dashboard/inventory'} variant="outline" className="w-full">
              Inventaris
            </Button>
            <Button onClick={() => window.location.href = '/dashboard/reports'} variant="outline" className="w-full">
              Laporan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
