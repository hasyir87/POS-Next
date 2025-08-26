
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

      // Jika ada user tapi profil belum termuat atau setup belum selesai
      if (user && profile) {
        if (!profile.organization?.is_setup_complete) {
          router.replace('/setup');
        }
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
  
  // Jika profil sudah ada dan setup sudah lengkap, tampilkan konten dasbor
  if (profile && profile.organization?.is_setup_complete) {
    return <>{children}</>;
  }

  // Fallback, seharusnya tidak pernah tercapai jika logika di atas benar
  return (
    <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
