
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { type Database, type UserProfile } from '@/types/database';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface AuthContextType {
  supabase: SupabaseClient<Database>;
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  login: ({ email, password }: { email: string; password: string }) => Promise<any>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (user: SupabaseUser | null) => {
    if (!user) {
      setProfile(null);
      setSelectedOrganizationId(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        setSelectedOrganizationId(null);
      } else {
        const userProfile = data as UserProfile;
        setProfile(userProfile);
        // Set the initial selected organization to the user's own organization
        if (userProfile?.organization_id) {
            setSelectedOrganizationId(userProfile.organization_id);
        }
      }
    } catch (e) {
      console.error("Catastrophic error fetching profile:", e);
      setProfile(null);
      setSelectedOrganizationId(null);
    }
  }, [supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await fetchUserProfile(currentUser);
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
    // The onAuthStateChange listener will handle fetching the profile and updating state.
    // The middleware will handle the redirect.
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener will clear user/profile state.
    // The middleware will handle the redirect.
    router.push('/');
    router.refresh();
  };
  
  const value = {
    supabase,
    user,
    profile,
    loading,
    selectedOrganizationId,
    setSelectedOrganizationId,
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
