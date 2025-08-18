
'use client';

import SignupForm from '@/components/SignupForm';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function SignupPage() {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Jika pengguna sudah login, arahkan ke dashboard
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  // Tampilkan loading spinner jika status otentikasi masih diperiksa
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Hanya tampilkan form jika pengguna belum login
  return <SignupForm />;
}
