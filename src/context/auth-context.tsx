
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
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase] = useState<SupabaseClient>(createClient());
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(null);

  const setSelectedOrganizationId = useCallback((orgId: string | null) => {
    if(orgId) {
      localStorage.setItem('selectedOrgId', orgId);
    } else {
      localStorage.removeItem('selectedOrgId');
    }
    setSelectedOrganizationIdState(orgId);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // Clear all states on logout
    setUser(null);
    setProfile(null);
    setSelectedOrganizationId(null);
    router.push('/');
  }, [supabase, router, setSelectedOrganizationId]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Error refreshing profile:", profileError.message);
    } else if (userProfile) {
        setProfile(userProfile as UserProfile);
    }
  }, [user, supabase]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
          console.error("Error getting session:", sessionError.message);
          setLoading(false);
          return;
      }
      
      if (session) {
        const currentUser = session.user;
        setUser(currentUser);

        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError.message);
        } else if (userProfile) {
          setProfile(userProfile as UserProfile);
          const storedOrgId = localStorage.getItem('selectedOrgId');
          if (storedOrgId) {
              setSelectedOrganizationIdState(storedOrgId);
          } else if (userProfile.organization_id) {
              setSelectedOrganizationId(userProfile.organization_id);
          }
        } else {
            console.warn(`No profile found for user ${currentUser.id}. The user is authenticated but has no profile entry.`);
            setProfile(null);
        }
      } else {
          setUser(null);
          setProfile(null);
          setSelectedOrganizationId(null);
      }
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchSession();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setSelectedOrganizationId(null);
          router.push('/');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, setSelectedOrganizationId]);

  const login = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
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
    setSelectedOrganizationId,
    login,
    logout,
    fetchWithAuth,
    refreshProfile
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
