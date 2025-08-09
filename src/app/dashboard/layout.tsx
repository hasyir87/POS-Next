
"use client";

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BarChart3, Clock, Home, LogOut, Menu, Settings, DollarSign, BookUser, Store, ChevronsUpDown, Users, PackageSearch, SprayCan } from "lucide-react";
import Link from "next/link";
import { MPerfumeAmalLogo } from "@/components/m-perfume-amal-logo";
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredRoles: Array<"owner" | "admin" | "cashier">;
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dasbor", icon: Home, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/pos", label: "Point of Sale", icon: Store, requiredRoles: ["owner", "admin", "cashier"] },
  { href: "/dashboard/products", label: "Produk", icon: SprayCan, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/shifts", label: "Shift", icon: Clock, requiredRoles: ["owner", "admin", "cashier"] },
  { href: "/dashboard/inventory", label: "Inventaris", icon: PackageSearch, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/members", label: "Anggota", icon: Users, requiredRoles: ["owner", "admin", "cashier"] },
  { href: "/dashboard/organizations", label: "Organisasi", icon: Store, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/users", label: "Pengguna", icon: Users, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/expenses", label: "Beban", icon: DollarSign, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/accounts", label: "Akun", icon: BookUser, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/reports", label: "Laporan", icon: BarChart3, requiredRoles: ["owner", "admin"] },
  { href: "/dashboard/settings", label: "Pengaturan", icon: Settings, requiredRoles: ["owner"] },
];

type Organization = {
  id: string;
  name: string;
  parent_organization_id: string | null;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, profile, loading, logout, selectedOrganizationId, setSelectedOrganizationId } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (user && profile) {
      const fetchOrganizations = async () => {
        setIsLoadingOrgs(true);
        try {
          const response = await fetch('/api/organizations');
          if (!response.ok) throw new Error('Failed to fetch organizations');
          
          const data: Organization[] = await response.json();
          setOrganizations(data);
          
          // Set default selected organization if not already set
          if (!selectedOrganizationId && data.length > 0) {
            const parentOrg = data.find(org => org.id === profile.organization_id) || data[0];
            setSelectedOrganizationId(parentOrg.id);
          }

        } catch (error) {
          console.error("Error fetching organizations:", error);
        } finally {
          setIsLoadingOrgs(false);
        }
      };
      fetchOrganizations();
    }
  }, [user, loading, profile, router, selectedOrganizationId, setSelectedOrganizationId]);

  if (loading || !user || !profile) {
    return <div>Loading...</div>;
  }

  const navItems = allNavItems.filter(item => item.requiredRoles.includes(profile.role));

  const handleLogout = async () => {
    await logout();
    router.push('/');
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
              <span className="font-headline text-xl">M Perfume Amal</span>
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
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link href="#" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <MPerfumeAmalLogo className="h-6 w-6 text-primary" />
                  <span className="font-headline text-xl">M Perfume Amal</span>
                </Link>
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
            {profile.role === 'owner' && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full max-w-xs">
                          <Store className="mr-2 h-4 w-4" />
                          <span className="flex-1 text-left">{isLoadingOrgs ? 'Loading...' : selectedOrganization?.name || 'Select Outlet'}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full max-w-xs">
                      <DropdownMenuLabel>Select Outlet</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {organizations.map((org) => (
                          <DropdownMenuItem key={org.id} onSelect={() => handleSelectOrganization(org.id)}>
                              {org.name}
                          </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src="https://placehold.co/40x40" alt="Avatar" />
                  <AvatarFallback>{profile.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{profile.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
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
