
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestAuthPage() {
  const { user, profile, loading, login, logout } = useAuth();
  const [email, setEmail] = useState('hasyir87@hotmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      await login({ email, password });
      console.log('Login successful');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login gagal');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Test Autentikasi</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Status Autentikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>User:</strong> {user ? 'Terautentikasi' : 'Tidak terautentikasi'}
              {user && (
                <div className="ml-4 text-sm text-gray-600">
                  <p>ID: {user.id}</p>
                  <p>Email: {user.email}</p>
                </div>
              )}
            </div>
            
            <div>
              <strong>Profile:</strong> {profile ? 'Tersedia' : 'Tidak tersedia'}
              {profile && (
                <div className="ml-4 text-sm text-gray-600">
                  <p>Name: {profile.full_name}</p>
                  <p>Role: {profile.role}</p>
                  <p>Organization ID: {profile.organization_id}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={isLoggingIn} className="w-full">
                  {isLoggingIn ? 'Login...' : 'Login'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
