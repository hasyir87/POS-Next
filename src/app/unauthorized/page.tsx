
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="mt-4">Akses Ditolak</CardTitle>
          <CardDescription>
            Maaf, Anda tidak memiliki izin untuk mengakses halaman yang Anda tuju.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Jika Anda merasa ini adalah sebuah kesalahan, silakan hubungi administrator sistem Anda.
          </p>
          <Button asChild>
            <Link href="/dashboard">Kembali ke Dasbor</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
