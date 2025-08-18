
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BarChart3, Clock, Home, LogOut, Menu, Settings, DollarSign, BookUser, Store, ChevronsUpDown, Users, PackageSearch, SprayCan, Loader2 } from "lucide-react";
import Link from "next/link";
import { MPerfumeAmalLogo } from "@/components/m-perfume-amal-logo";
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import type { Organization, UserProfile } from '@/types/database';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredRoles: Array<UserProfile['role']>;
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dasbor", icon: Home, requiredRoles: ["owner", "admin", "superadmin"] },
  { href: "/dashboard/pos", label: "Point of Sale", icon: Store, requiredRoles: ["owner", "admin", "cashier", "superadmin"] },
  { href: "/dashboard/products", label: "Produk", icon: SprayCan, requiredRoles: ["owner", "admin", "superadmin"] },
  { href: "/dashboard/inventory", label: "Inventaris", icon: PackageSearch, requiredRoles: ["owner", "admin", "superadmin"] },
  { href: "/dashboard/members", label: "Anggota", icon: Users, requiredRoles: ["owner", "admin", "cashier", "superadmin"] },
  { href: "/dashboard/users", label: "Pengguna", icon: Users, requiredRoles: ["owner", "admin", "superadmin"] },
  { href: "/dashboard/reports", label: "Laporan", icon: BarChart3, requiredRoles: ["owner", "admin", "superadmin"] },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings, requiredRoles: ["owner", "superadmin"] },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, profile, loading, logout, selectedOrganizationId, setSelectedOrganizationId, fetchWithAuth } = useAuth();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    // We can fetch organizations even without a profile if the user is a superadmin,
    // but for now, we'll keep it simple and require a profile to know which orgs to fetch.
    if (!profile) {
      setIsLoadingOrgs(false);
      return;
    }

    setIsLoadingOrgs(true);
    try {
      const response = await fetchWithAuth('/api/organizations');
      if (!response.ok) throw new Error('Gagal mengambil data organisasi.');
      const data = await response.json();
      setOrganizations(data || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setOrganizations([]);
    } finally {
      setIsLoadingOrgs(false);
    }
  }, [profile, fetchWithAuth]);


  useEffect(() => {
    if (!loading && user) {
      fetchOrganizations();
    }
  }, [user, loading, fetchOrganizations]);

  // Main loading state for the entire auth process
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is done and still no user, something is wrong, redirect handled by middleware/page
  if (!user) {
    return null;
  }
  
  const navItems = profile ? allNavItems.filter(item => profile.role && item.requiredRoles.includes(profile.role)) : [];

  const handleLogout = async () => {
    await logout();
  };

  const handleSelectOrganization = (orgId: string) => {
    setSelectedOrganizationId(orgId);
  };
  
  const selectedOrganization = organizations.find(org => org.id === selectedOrganizationId);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <MPerfumeAmalLogo className="h-6 w-6 text-primary" />
              <span className="font-headline text-xl">ScentPOS</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                 <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Buka menu navigasi</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Navigasi Utama</SheetTitle>
                 <Link href="#" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <MPerfumeAmalLogo className="h-6 w-6 text-primary" />
                  <span className="font-headline text-xl">ScentPOS</span>
                </Link>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {profile && (profile.role === 'owner' || profile.role === 'superadmin' || profile.role === 'admin') && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full max-w-xs">
                          <Store className="mr-2 h-4 w-4" />
                          <span className="flex-1 text-left">{isLoadingOrgs ? 'Memuat...' : selectedOrganization?.name || 'Pilih Outlet'}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full max-w-xs">
                      <DropdownMenuLabel>Pilih Outlet</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {isLoadingOrgs ? (
                        <DropdownMenuItem disabled>Memuat...</DropdownMenuItem>
                      ) : (
                        organizations.map((org) => (
                          <DropdownMenuItem key={org.id} onSelect={() => handleSelectOrganization(org.id)}>
                              {org.name}
                          </DropdownMenuItem>
                        ))
                      )}
                  </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || "https://placehold.co/40x40"} alt={profile?.full_name || 'Avatar'} data-ai-hint="avatar" />
                  <AvatarFallback>{profile?.full_name?.substring(0, 2).toUpperCase() || user.email?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Buka menu pengguna</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{profile?.full_name || user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Dukungan</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
