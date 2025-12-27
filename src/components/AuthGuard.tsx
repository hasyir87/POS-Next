
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Jika pengecekan selesai dan tidak ada user, tendang ke halaman login
      if (!user) {
        router.replace('/');
        return;
      }
    }
  }, [user, profile, loading, router]);

  // Selama loading, tampilkan spinner
  if (loading || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Jika profil sudah ada, tampilkan konten dasbor
  if (profile) {
    return <>{children}</>;
  }

  // Fallback, seharusnya tidak pernah tercapai jika logika di atas benar
  return (
    <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
