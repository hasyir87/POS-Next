
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Tipe untuk peran pengguna, sesuai dengan tipe 'user_role' di Supabase
export type UserRole = "owner" | "admin" | "cashier";

// Perbarui interface UserProfile agar sesuai dengan skema tabel 'profiles' yang baru
export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  organization_id: string | null;
}

// Definisikan tipe untuk AuthContext
interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  login: ({ email, password }: { email: string; password: string }) => Promise<any>;
  logout: () => Promise<void>;
}

// Buat AuthContext dengan nilai default
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        await fetchProfile(sessionUser);
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        await fetchProfile(sessionUser);
      } else {
        setProfile(null);
        setSelectedOrganizationId(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, organization_id')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        if (error.code === 'PGRST116') {
          // Profile tidak ditemukan, buat profile default
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: supabaseUser.id,
              email: supabaseUser.email,
              full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
              role: 'cashier',
              organization_id: null
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating profile:", createError);
            setProfile(null);
          } else {
            setProfile(newProfile as UserProfile);
          }
        } else {
          setProfile(null);
        }
      } else if (data) {
        const userProfile = data as UserProfile;
        setProfile(userProfile);
        // Atur organisasi terpilih default ke organisasi pengguna saat profil dimuat
        if (userProfile.organization_id) {
          setSelectedOrganizationId(userProfile.organization_id);
        }
      }
    } catch (e) {
      console.error("An unexpected error occurred while fetching profile:", e);
      setProfile(null);
    }
  };
  
  const login = async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    loading,
    selectedOrganizationId,
    setSelectedOrganizationId,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook untuk menggunakan AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
