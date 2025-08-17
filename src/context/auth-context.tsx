
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedOrgId');
    }
    return null;
  });

  const handleSetSelectedOrg = (orgId: string | null) => {
    if (orgId) {
      localStorage.setItem('selectedOrgId', orgId);
    } else {
      localStorage.removeItem('selectedOrgId');
    }
    setSelectedOrganizationId(orgId);
  }

  const fetchUserProfile = useCallback(async (user: SupabaseUser | null) => {
    if (!user) {
      setProfile(null);
      handleSetSelectedOrg(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        throw new Error(error.message);
      }
      
      const userProfile = data as UserProfile;
      setProfile(userProfile);
      
      if (userProfile) {
        const storedOrgId = localStorage.getItem('selectedOrgId');
        if (storedOrgId) {
            setSelectedOrganizationId(storedOrgId);
        } else if (userProfile.organization_id) {
            handleSetSelectedOrg(userProfile.organization_id);
        }
      } else {
         handleSetSelectedOrg(null);
      }

      return userProfile;
    } catch (e: any) {
      console.error("Error fetching profile:", e.message);
      setProfile(null);
      handleSetSelectedOrg(null);
      throw e;
    }
  }, [supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await fetchUserProfile(currentUser).catch(() => {
        logout();
      });
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);


  const login = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    handleSetSelectedOrg(null);
    router.push('/');
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
