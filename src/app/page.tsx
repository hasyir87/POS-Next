
'use client';

import { LoginForm } from '@/components/login-form';
import { MPerfumeAmalLogo } from '@/components/m-perfume-amal-logo';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

export default function Home() {
  const { loading, user } = useAuth();

  // The AuthProvider now handles redirection, so this component can be simpler.
  // We don't want to show the login page if the user is already logged in.
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
