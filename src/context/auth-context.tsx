
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';

interface AuthContextType {
  supabase: SupabaseClient;
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
  const supabase = createClient();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } else {
      const userProfile = data as UserProfile;
      setProfile(userProfile);
      if (!selectedOrganizationId && userProfile.organization_id) {
        setSelectedOrganizationId(userProfile.organization_id);
      }
    }
    return data;
  }, [supabase, selectedOrganizationId]);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    };
    
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setSelectedOrganizationId(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);


  const login = async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
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
