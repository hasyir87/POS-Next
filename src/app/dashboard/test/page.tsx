"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

type TestResult = {
  status: "success" | "error";
  message: string;
  data?: any;
};

export default function TestPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTest = async (testName: string, url: string, options: RequestInit = {}) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || JSON.stringify(data));
      }
      setResults(prev => ({ ...prev, [testName]: { status: "success", message: "Test passed successfully!", data } }));
    } catch (err: any) {
      setResults(prev => ({ ...prev, [testName]: { status: "error", message: err.message } }));
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }));
    }
  };
  
  const testCreateDuplicateUser = async () => {
    // First call should succeed or fail gracefully if user exists
    await runTest('create-test-account-1', '/api/create-test-account', { method: 'POST' });
    // Second call should definitely fail with a unique constraint error
    await runTest('create-test-account-2', '/api/create-test-account', { method: 'POST' });
  };


  return (
    <div className="p-6 space-y-6">
      <h1 className="font-headline text-3xl font-bold">Halaman Pengujian</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <Card>
          <CardHeader>
            <CardTitle>1. Tes Koneksi Database</CardTitle>
            <CardDescription>Memastikan API dapat terhubung ke Supabase dan mengambil data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => runTest('db-connection', '/api/test-connection')} disabled={loading['db-connection']}>
              {loading['db-connection'] ? 'Mengetes...' : 'Jalankan Tes'}
            </Button>
            {results['db-connection'] && (
              <pre className={`mt-4 p-2 rounded-md text-xs ${results['db-connection'].status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {results['db-connection'].message}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Tes Error Duplikat</CardTitle>
            <CardDescription>Mencoba membuat user yang sama dua kali untuk memicu error unique constraint.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCreateDuplicateUser} disabled={loading['create-test-account-2']}>
               {loading['create-test-account-2'] ? 'Mengetes...' : 'Jalankan Tes'}
            </Button>
             {results['create-test-account-2'] && (
              <pre className={`mt-4 p-2 rounded-md text-xs ${results['create-test-account-2'].status === 'error' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Hasil yang Diharapkan:</strong> Gagal dengan pesan "Data sudah ada".<br/>
                <strong>Hasil Aktual:</strong> {results['create-test-account-2'].message}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Tes Akses RLS (Tanpa Auth)</CardTitle>
            <CardDescription>Mencoba mengambil data yang dilindungi RLS tanpa otentikasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => runTest('rls-fail', '/api/promotions')} disabled={loading['rls-fail']}>
              {loading['rls-fail'] ? 'Mengetes...' : 'Jalankan Tes'}
            </Button>
            {results['rls-fail'] && (
               <pre className={`mt-4 p-2 rounded-md text-xs ${results['rls-fail'].status === 'error' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Hasil yang Diharapkan:</strong> Gagal dengan error 401 Unauthorized.<br/>
                <strong>Hasil Aktual:</strong> {results['rls-fail'].message}
              </pre>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
