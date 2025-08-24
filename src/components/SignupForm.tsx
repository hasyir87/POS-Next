
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MPerfumeAmalLogo } from "./m-perfume-amal-logo";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Nama lengkap minimal 3 karakter." }),
  organizationName: z.string().min(3, { message: "Nama organisasi minimal 3 karakter." }),
  email: z.string().email({ message: "Harap masukkan email yang valid." }),
  password: z.string().min(6, { message: "Password minimal 6 karakter." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok.",
  path: ["confirmPassword"],
});


export default function SignupForm() {
  const [error, setErrorState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      organizationName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { setError } = form;

  const handleSignup = async (values: z.infer<typeof formSchema>) => {
    setErrorState(null);
    setSuccess(null);
    setLoading(true);

    try {
      // This MUST be the URL of the onRequest HTTP function
      const region = "us-central1"; // Ganti jika region Anda berbeda
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (!projectId) {
        throw new Error("ID Proyek Firebase tidak dikonfigurasi di variabel lingkungan.");
      }
      
      const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/createOwner`;

      const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: {
                email: values.email,
                password: values.password,
                fullName: values.fullName,
                organizationName: values.organizationName
          }})
      });
      
      const result = await response.json();

      if (!response.ok) {
        // Use the error message from the backend if available
        throw new Error(result.error?.message || `Error ${response.status}: Pendaftaran gagal.`);
      }
      
      setSuccess("Pendaftaran berhasil! Anda akan diarahkan ke halaman login.");
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err: any) {
      console.error("Signup component error:", err);
      // Display a more user-friendly message for generic fetch errors
      const errorMessage = err.message.includes('Failed to fetch') 
        ? "Gagal terhubung ke server. Periksa koneksi internet Anda atau hubungi dukungan jika masalah berlanjut."
        : err.message || "Terjadi kesalahan yang tidak terduga.";
        
      setErrorState(errorMessage);

      if (errorMessage.toLowerCase().includes('email')) {
          setError('email', { type: 'manual', message: errorMessage });
      } else if (errorMessage.toLowerCase().includes('organisasi')) {
           setError('organizationName', { type: 'manual', message: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <MPerfumeAmalLogo className="w-12 h-12 mx-auto text-primary" />
            <CardTitle className="font-headline text-2xl mt-2">Buat Akun Pemilik</CardTitle>
            <CardDescription>Daftarkan organisasi Anda untuk memulai.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
               {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Pendaftaran</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert>
                    <AlertTitle>Sukses!</AlertTitle>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap Anda</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Organisasi/Toko</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: ScentPRO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Pemilik</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="nama@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading || !!success}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Daftar sebagai Pemilik"}
              </Button>
            </form>
          </Form>
           <div className="mt-4 text-center text-sm">
                Sudah punya akun?{" "}
                <Link href="/" className="underline">
                    Masuk di sini
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
