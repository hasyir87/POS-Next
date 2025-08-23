
'use client';

import { LoginForm } from '@/components/login-form';
import { MPerfumeAmalLogo } from '@/components/m-perfume-amal-logo';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if(!loading && user) {
        router.replace('/dashboard');
    }
  }, [loading, user, router]);

  // Don't show the login page if the user is already logged in or we are still checking.
  if (loading || user) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <MPerfumeAmalLogo className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold text-foreground font-headline">ScentPOS</h1>
          <p className="text-muted-foreground">Masuk ke sistem manajemen toko</p>
        </div>
        <LoginForm />
         <div className="mt-4 text-center text-sm">
            Belum punya akun?{" "}
            <Link href="/signup" className="underline">
                Daftar sekarang
            </Link>
        </div>
      </div>
    </div>
  );
}
