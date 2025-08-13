import { LoginForm } from '@/components/login-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4">
        <LoginForm />
        <div className="text-center">
          <Link href="/test">
            <Button variant="outline" size="sm">
              Test Page
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
