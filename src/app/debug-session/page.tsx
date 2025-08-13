
'use client';

import { useAuth } from '@/context/auth-context';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

export default function DebugSessionPage() {
  const { user, profile, loading } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [promotionsTest, setPromotionsTest] = useState<any>(null);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      setSessionInfo({
        session: session ? {
          user_id: session.user?.id,
          email: session.user?.email,
          expires_at: session.expires_at,
          expires_readable: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          is_expired: session.expires_at ? new Date(session.expires_at * 1000) <= new Date() : null
        } : null,
        error: error
      });
    } catch (err) {
      setSessionInfo({ error: err });
    }
  };

  const testPromotions = async () => {
    try {
      const response = await fetch('/api/promotions');
      const data = await response.json();
      setPromotionsTest({
        status: response.status,
        statusText: response.statusText,
        data: data
      });
    } catch (err: any) {
      setPromotionsTest({
        error: err.message
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Session Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Auth Context:</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify({
                  user: user ? { id: user.id, email: user.email } : null,
                  profile: profile,
                  loading: loading
                }, null, 2)}
              </pre>
            </div>
            
            <Button onClick={checkSession}>Check Supabase Session</Button>
            
            {sessionInfo && (
              <div>
                <h3 className="font-semibold">Supabase Session:</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(sessionInfo, null, 2)}
                </pre>
              </div>
            )}
            
            <Button onClick={testPromotions}>Test Promotions API</Button>
            
            {promotionsTest && (
              <div>
                <h3 className="font-semibold">Promotions API Test:</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(promotionsTest, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
