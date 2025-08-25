
'use client';

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { AlertTriangle, DollarSign, Loader2, Package, TrendingUp, Users } from 'lucide-react';
// import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
// import { Trophy } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCallback, useEffect, useState } from 'react';
// import { getFunctions, httpsCallable } from 'firebase/functions';
// import { firebaseApp } from '@/lib/firebase/config';

// const functions = getFunctions(firebaseApp);

// const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
// };

// interface DashboardData {
//     dailyRevenue: number;
//     dailySalesCount: number;
//     newCustomersToday: number;
//     topProducts: Array<{ name: string | null, sales: number | null }>;
// }

export default function DashboardPage() {
  const { loading: authLoading, selectedOrganizationId } = useAuth();
  // const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // const fetchDashboardData = useCallback(async () => {
  //   if (!selectedOrganizationId) {
  //       setIsLoading(false);
  //       return;
  //   }
    
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //       const getDashboardAnalytics = httpsCallable(functions, 'get_dashboard_analytics');
  //       const result = await getDashboardAnalytics({ organizationId: selectedOrganizationId });
  //       const data = result.data as DashboardData;
  //       setDashboardData(data);
  //   } catch (err: any) {
  //       console.error("Error fetching dashboard data:", err);
  //       setError(err.message || "Gagal memuat data dasbor.");
  //   } finally {
  //       setIsLoading(false);
  //   }
  // }, [selectedOrganizationId]);

  // useEffect(() => {
  //   if (!authLoading && selectedOrganizationId) {
  //     fetchDashboardData();
  //   } else if (!authLoading && !selectedOrganizationId) {
  //     setIsLoading(false);
  //   }
  // }, [authLoading, selectedOrganizationId, fetchDashboardData]);
  
  // if (authLoading) {
  //   return (
  //     <div className="flex h-full w-full items-center justify-center">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  // if (!selectedOrganizationId) {
  //   return (
  //     <Card className="m-auto">
  //       <CardHeader>
  //         <CardTitle>Selamat Datang!</CardTitle>
  //         <CardDescription>
  //           Untuk memulai, silakan pilih outlet atau organisasi dari menu dropdown di bagian atas halaman ini.
  //         </CardDescription>
  //       </CardHeader>
  //     </Card>
  //   );
  // }
  
  //  if (isLoading) {
  //   return (
  //     <div className="flex h-full w-full items-center justify-center">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }
  
  //  if (error) {
  //   return (
  //     <Alert variant="destructive">
  //       <AlertTriangle className="h-4 w-4" />
  //       <AlertTitle>Terjadi Kesalahan</AlertTitle>
  //       <AlertDescription>
  //         {error}
  //       </AlertDescription>
  //     </Alert>
  //   );
  // }


  return (
    <div style={{ padding: '50px', border: '2px solid blue', textAlign: 'center' }}>
      <h1>TEST DASHBOARD PAGE</h1>
      <p>Auth Loading: {authLoading ? 'True' : 'False'}</p>
      <p>Selected Org ID: {selectedOrganizationId || 'None'}</p>
    </div>
  );
}
