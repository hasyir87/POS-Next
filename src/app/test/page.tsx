
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function TestPage() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runTest = async (testName: string, endpoint: string, method: string = 'GET') => {
    setIsLoading(true);
    try {
      const response = await fetch(endpoint, { method });
      const data = await response.json();
      
      const result = {
        test: testName,
        status: response.ok ? 'success' : 'error',
        data,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setResults(prev => [result, ...prev]);
      
      if (response.ok) {
        toast({ title: "Success", description: `${testName} berhasil` });
      } else {
        toast({ title: "Error", description: `${testName} gagal`, variant: "destructive" });
      }
    } catch (error: any) {
      const result = {
        test: testName,
        status: 'error',
        data: { message: error.message },
        timestamp: new Date().toLocaleTimeString()
      };
      setResults(prev => [result, ...prev]);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => setResults([]);

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Testing & Simulasi Aplikasi</CardTitle>
          <CardDescription>
            Panel untuk menguji fungsionalitas aplikasi M Perfume Amal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => runTest('Database Connection', '/api/test-db')}
              disabled={isLoading}
              variant="outline"
            >
              Test Database
            </Button>
            
            <Button
              onClick={() => runTest('Create Test Account', '/api/create-test-account', 'POST')}
              disabled={isLoading}
              variant="outline"
            >
              Buat Akun Test
            </Button>
            
            <Button
              onClick={() => runTest('Get Organizations', '/api/organizations')}
              disabled={isLoading}
              variant="outline"
            >
              Test Organizations API
            </Button>
            
            <Button
              onClick={() => runTest('Get Users', '/api/users')}
              disabled={isLoading}
              variant="outline"
            >
              Test Users API
            </Button>
            
            <Button
              onClick={() => runTest('Get Products', '/api/products')}
              disabled={isLoading}
              variant="outline"
            >
              Test Products API
            </Button>
            
            <Button
              onClick={clearResults}
              variant="destructive"
              disabled={isLoading}
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{result.test}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                        {result.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{result.timestamp}</span>
                    </div>
                  </div>
                  <pre className="bg-muted p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
