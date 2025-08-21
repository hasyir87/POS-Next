
'use client';

import SignupForm from '@/components/SignupForm';
import { useAuth } from '@/context/auth-context';

export default function SignupPage() {
  const { loading, user } = useAuth();
  
  // Don't show the signup page if the user is already logged in
  if(loading || user) {
    return null; // or a loading spinner
  }

  return <SignupForm />;
}
