
'use client';

import SignupForm from '@/components/SignupForm';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupPage() {
  const { loading, user } = useAuth();
  const router = useRouter();

  // Redirect if user is already logged in
  useEffect(() => {
    if(!loading && user) {
        router.replace('/dashboard');
    }
  }, [loading, user, router]);

  // Don't render the form if we are still checking auth state or if user is logged in
  if(loading || user) {
    return null; // or a loading spinner
  }

  return <SignupForm />;
}
