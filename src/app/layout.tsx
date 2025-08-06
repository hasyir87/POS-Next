
"use client";

import { AuthProvider } from '@/context/auth-context';

// No metadata export from client component
// export const metadata: Metadata = {
//   title: 'ScentPOS',
//   description: 'Point of Sale untuk parfum eksklusif.',
// };

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <title>M Perfume Amal</title>
        <meta name="description" content="Point of Sale untuk M Perfume Amal." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
