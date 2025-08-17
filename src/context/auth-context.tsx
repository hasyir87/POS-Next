
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import type { UserProfile } from '@/types/database';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  supabase: SupabaseClient;
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  login: ({ email, password }: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const handleSetSelectedOrg = (orgId: string | null) => {
    if (typeof window !== 'undefined') {
        if (orgId) {
            localStorage.setItem('selectedOrgId', orgId);
        } else {
            localStorage.removeItem('selectedOrgId');
        }
    }
    setSelectedOrganizationId(orgId);
  }

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    handleSetSelectedOrg(null);
    setProfile(null);
    setUser(null);
    router.push('/'); 
    router.refresh();
  }, [supabase, router]);

  useEffect(() => {
    const fetchSession = async () => {
      // 1. Dapatkan sesi saat ini
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session Error:", sessionError.message);
        setLoading(false);
        return;
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // 2. Jika ada user, ambil profilnya
      if (currentUser) {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError.message);
          // Jika gagal ambil profil (misalnya RLS), paksa logout agar tidak stuck
          await logout();
          setLoading(false);
          return;
        }

        setProfile(userProfile);

        // 3. Atur organisasi yang dipilih
        const storedOrgId = localStorage.getItem('selectedOrgId');
        if (storedOrgId) {
          setSelectedOrganizationId(storedOrgId);
        } else if (userProfile.organization_id) {
          handleSetSelectedOrg(userProfile.organization_id);
        }
      }

      setLoading(false);
    };

    fetchSession();

    // 4. Dengarkan perubahan status otentikasi
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
        // Jika sign out, bersihkan state
        if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            handleSetSelectedOrg(null);
            router.push('/');
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            // Jika ada event login atau update, ambil ulang sesi & profil
            fetchSession();
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // <-- Hook ini hanya berjalan sekali saat komponen dimuat

  const login = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
    // `onAuthStateChange` akan menangani sisanya
  };
  
  const value = {
    supabase,
    user,
    profile,
    loading,
    selectedOrganizationId,
    setSelectedOrganizationId: handleSetSelectedOrg,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
