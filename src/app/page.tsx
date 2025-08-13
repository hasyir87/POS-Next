'use client';

import LoginForm from '@/components/login-form';
import { MPerfumeAmalLogo } from '@/components/m-perfume-amal-logo';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <p className="text-lg">Mengalihkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <MPerfumeAmalLogo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">M Perfume Amal</h1>
          <p className="text-gray-600 mb-4">Point of Sale System</p>
          <p className="text-sm text-gray-500">Silakan masuk ke akun Anda</p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Belum punya akun?{' '}
            <a href="/signup" className="text-purple-600 hover:text-purple-800 font-medium">
              Daftar di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}