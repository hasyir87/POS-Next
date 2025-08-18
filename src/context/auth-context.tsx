
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { type SupabaseClient, type Session, type User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import type { UserProfile } from '@/types/database';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  supabase: SupabaseClient | null;
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  login: ({ email, password }: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    // Inisialisasi Supabase client hanya sekali
    const supabaseClient = createClient();
    setSupabase(supabaseClient);

    const fetchSession = async () => {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (session) {
        const currentUser = session.user;
        setUser(currentUser);
        
        const { data: userProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError.message);
        } else if (userProfile) {
          setProfile(userProfile);
          const storedOrgId = localStorage.getItem('selectedOrgId');
          if (storedOrgId) {
            setSelectedOrganizationId(storedOrgId);
          } else {
            setSelectedOrganizationId(userProfile.organization_id);
            if (userProfile.organization_id) {
               localStorage.setItem('selectedOrgId', userProfile.organization_id);
            }
          }
        } else {
           console.warn(`No profile found for user ${currentUser.id}. The user is authenticated but has no profile entry.`);
           setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
        setSelectedOrganizationId(null);
        localStorage.removeItem('selectedOrgId');
      }
      setLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      // Re-fetch session & profile data on auth state change
      fetchSession();
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }: { email: string; password: string }) => {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange akan menangani sisanya
  };

  const logout = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    // onAuthStateChange akan membersihkan state
  }, [supabase]);
  
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
      if (!supabase) throw new Error("Supabase client not initialized.");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers = new Headers(options.headers || {});
      if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
      }

      return fetch(url, { ...options, headers });
  }, [supabase]);


  const value = {
    supabase,
    user,
    profile,
    loading,
    selectedOrganizationId,
    setSelectedOrganizationId: (orgId: string | null) => {
        if(orgId) localStorage.setItem('selectedOrgId', orgId);
        else localStorage.removeItem('selectedOrgId');
        setSelectedOrganizationId(orgId);
    },
    login,
    logout,
    fetchWithAuth,
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
