

'use client';

import { LoginForm } from '@/components/login-form';
import { MPerfumeAmalLogo } from '@/components/m-perfume-amal-logo';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { loading, user } = useAuth();

  // Show a loading indicator while the auth state is being determined
  // or if the user is logged in and a redirect is imminent.
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // Only show the login form if not loading and no user is present.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <MPerfumeAmalLogo className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold text-foreground font-headline">ScentPOS</h1>
          <p className="text-muted-foreground">Masuk ke sistem manajemen toko</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
