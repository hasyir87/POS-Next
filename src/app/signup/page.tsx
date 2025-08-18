
'use client';

import SignupForm from '@/components/SignupForm';

export default function SignupPage() {
  // Halaman ini tidak lagi memerlukan AuthContext, karena ini adalah halaman publik.
  // Logika pengalihan setelah login ditangani oleh middleware dan halaman login itu sendiri.
  return <SignupForm />;
}
