
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
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session Error:", sessionError.message);
        setLoading(false);
        return;
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError.message);
          await logout();
        } else if (userProfile) {
          setProfile(userProfile);
          const storedOrgId = localStorage.getItem('selectedOrgId');
          if (storedOrgId) {
            setSelectedOrganizationId(storedOrgId);
          } else if (userProfile.organization_id) {
            handleSetSelectedOrg(userProfile.organization_id);
          }
        } else {
            console.warn(`No profile found for user ${currentUser.id}. Logging out.`);
            await logout();
        }
      }

      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            handleSetSelectedOrg(null);
            router.push('/');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if(session?.user && session.user.id !== user?.id){
                 fetchSession();
            }
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
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
