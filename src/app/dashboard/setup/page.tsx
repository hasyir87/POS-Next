
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Rocket, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { fetchWithAuth, refreshProfile } = useAuth();
  const router = useRouter();

  const handleSetup = async () => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      // The API now gets the organizationId from the user's token,
      // so we don't need to send a body anymore.
      const response = await fetchWithAuth('/api/setup/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal melakukan setup toko.');
      }

      setIsSuccess(true);
      // Refresh the user's profile in the context to get the updated `is_setup_complete` flag
      await refreshProfile(); 
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Rocket className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="mt-4 text-2xl font-headline">Selamat Datang di ScentPOS!</CardTitle>
          <CardDescription>
            Tinggal satu langkah lagi. Mari kita siapkan toko pertama Anda dengan beberapa data awal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Dengan mengklik tombol di bawah, kami akan secara otomatis mengisi toko Anda dengan:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Kategori produk standar (Bibit Parfum, Kemasan, dll.)</li>
              <li>Grade parfum awal (Standard, Premium)</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Anda dapat mengubah semua ini nanti di halaman Pengaturan.
            </p>
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Terjadi Kesalahan</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isSuccess ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Setup Berhasil!</AlertTitle>
                <AlertDescription>
                  Toko Anda telah berhasil disiapkan. Anda akan diarahkan ke dasbor...
                </AlertDescription>
              </Alert>
            ) : (
              <Button onClick={handleSetup} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Lakukan Setup Toko Saya
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
