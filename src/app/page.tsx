'use client';

import { LoginForm } from '@/components/login-form';
import { MPerfumeAmalLogo } from '@/components/m-perfume-amal-logo';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Memuat sesi atau mengalihkan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <MPerfumeAmalLogo className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold text-foreground font-headline">M Perfume Amal</h1>
          <p className="text-muted-foreground">Masuk ke sistem manajemen toko</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
