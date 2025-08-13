
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Loader2, Database, User, ShoppingCart, Tag } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  message?: string;
  data?: any;
  duration?: number;
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const updateResult = (name: string, result: Partial<TestResult>) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, ...result } : r);
      }
      return [...prev, { name, status: 'loading', ...result }];
    });
  };

  const runTest = async (testName: string, endpoint: string, method: string = 'GET') => {
    const startTime = Date.now();
    updateResult(testName, { status: 'loading' });

    try {
      const response = await fetch(endpoint, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (response.ok) {
        updateResult(testName, {
          status: 'success',
          message: data.message || 'Test berhasil',
          data,
          duration
        });
      } else {
        updateResult(testName, {
          status: 'error',
          message: data.error || data.message || 'Test gagal',
          data,
          duration
        });
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateResult(testName, {
        status: 'error',
        message: error.message || 'Network error',
        duration
      });
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults([]);

    const tests = [
      { name: 'Database Connection', endpoint: '/api/test-connection' },
      { name: 'Test Database Setup', endpoint: '/api/test-db' },
      { name: 'Create Test Account', endpoint: '/api/create-test-account', method: 'POST' },
      { name: 'Organizations API', endpoint: '/api/organizations' },
      { name: 'Users API', endpoint: '/api/users' },
      { name: 'Products API', endpoint: '/api/products' },
      { name: 'Promotions API', endpoint: '/api/promotions' },
      { name: 'Transactions API', endpoint: '/api/transactions' },
      { name: 'Categories API', endpoint: '/api/categories' }
    ];

    for (const test of tests) {
      await runTest(test.name, test.endpoint, test.method || 'GET');
      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'loading':
        return <Badge variant="outline">Loading</Badge>;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalTests = results.length;

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Testing & Simulasi Aplikasi
          </CardTitle>
          <CardDescription>
            Panel untuk menguji fungsionalitas aplikasi M Perfume Amal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={runAllTests}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Jalankan Semua Test
            </Button>
            
            <Button
              onClick={clearResults}
              variant="outline"
              disabled={isLoading}
            >
              Clear Results
            </Button>
          </div>

          {totalTests > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">✓ Success: {successCount}</span>
              <span className="text-red-600">✗ Error: {errorCount}</span>
              <span className="text-gray-600">Total: {totalTests}</span>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => runTest('Database Connection', '/api/test-connection')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Test Database
            </Button>
            
            <Button
              onClick={() => runTest('Test Database Setup', '/api/test-db')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Setup Test Data
            </Button>
            
            <Button
              onClick={() => runTest('Create Test Account', '/api/create-test-account', 'POST')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Buat Akun Test
            </Button>
            
            <Button
              onClick={() => runTest('Organizations API', '/api/organizations')}
              disabled={isLoading}
              variant="outline"
            >
              Test Organizations
            </Button>
            
            <Button
              onClick={() => runTest('Users API', '/api/users')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Test Users
            </Button>
            
            <Button
              onClick={() => runTest('Products API', '/api/products')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Test Products
            </Button>
            
            <Button
              onClick={() => runTest('Promotions API', '/api/promotions')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Tag className="h-4 w-4" />
              Test Promotions
            </Button>
            
            <Button
              onClick={() => runTest('Transactions API', '/api/transactions')}
              disabled={isLoading}
              variant="outline"
            >
              Test Transactions
            </Button>
            
            <Button
              onClick={() => runTest('Categories API', '/api/categories')}
              disabled={isLoading}
              variant="outline"
            >
              Test Categories
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Test</CardTitle>
            <CardDescription>
              Hasil dari test yang telah dijalankan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <h3 className="font-medium">{result.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.duration && (
                        <span className="text-xs text-muted-foreground">
                          {result.duration}ms
                        </span>
                      )}
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                  
                  {result.message && (
                    <Alert className={result.status === 'error' ? 'border-red-200' : 'border-green-200'}>
                      <AlertDescription>{result.message}</AlertDescription>
                    </Alert>
                  )}
                  
                  {result.data && result.status === 'success' && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        View Response Data
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
