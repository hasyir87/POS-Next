
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

export default function TestLoginPage() {
  const [email, setEmail] = useState('test@mperfumeamal.com');
  const [password, setPassword] = useState('test123456');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { user, profile } = useAuth();

  const testDirectLogin = async () => {
    setLoading(true);
    try {
      // Clear storage first
      localStorage.removeItem('sb-qcqhuznvlivgpkqaurcb-auth-token');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if session is stored
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      setResult({
        success: true,
        loginData: data,
        sessionCheck: session,
        sessionError: sessionError,
        storageCheck: localStorage.getItem('sb-qcqhuznvlivgpkqaurcb-auth-token')
      });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      });
    }
    setLoading(false);
  };

  const testAuthContextLogin = async () => {
    setLoading(true);
    try {
      const { login } = useAuth();
      const result = await login({ email, password });
      setResult({
        success: true,
        method: 'auth-context',
        result: result
      });
    } catch (error: any) {
      setResult({
        success: false,
        method: 'auth-context',
        error: error.message
      });
    }
    setLoading(false);
  };

  const clearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    setResult({ message: 'Storage cleared' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Login & Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label>Email:</label>
            <Input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </div>
          
          <div className="space-y-2">
            <label>Password:</label>
            <Input 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
          </div>

          <div className="space-x-2">
            <Button onClick={testDirectLogin} disabled={loading}>
              Test Direct Login
            </Button>
            <Button onClick={clearStorage}>
              Clear Storage
            </Button>
          </div>

          <div>
            <h3 className="font-semibold">Current Auth State:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify({
                user: user ? { id: user.id, email: user.email } : null,
                profile: profile,
                localStorage: typeof window !== 'undefined' ? localStorage.getItem('sb-qcqhuznvlivgpkqaurcb-auth-token') : null
              }, null, 2)}
            </pre>
          </div>

          {result && (
            <div>
              <h3 className="font-semibold">Test Result:</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
