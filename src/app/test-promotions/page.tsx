
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestPromotionsPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testPromotions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-promotions');
      const data = await response.json();
      setTestResult(data);
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Promotions API</CardTitle>
          <CardDescription>
            Test koneksi dan data promosi dari database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testPromotions} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? 'Testing...' : 'Test Promotions'}
          </Button>

          {testResult && (
            <div className="mt-4">
              <Badge variant={testResult.success ? 'default' : 'destructive'}>
                {testResult.success ? 'Success' : 'Failed'}
              </Badge>
              
              <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-xs">
                {JSON.stringify(testResult, null, 2)}
              </pre>

              {testResult.success && testResult.data && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Promotions Found:</h3>
                  {testResult.data.length === 0 ? (
                    <p>No promotions found in database</p>
                  ) : (
                    <div className="space-y-2">
                      {testResult.data.map((promo: any) => (
                        <div key={promo.id} className="border p-3 rounded">
                          <h4 className="font-medium">{promo.name}</h4>
                          <p className="text-sm text-gray-600">
                            Type: {promo.type} | Value: {promo.value} | Active: {promo.is_active ? 'Yes' : 'No'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
