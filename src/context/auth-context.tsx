"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Definisikan tipe untuk data profil tambahan kita
export interface UserProfile {
  id: string;
  name: string;
  role: "owner" | "admin" | "cashier";
  organization_id: string;
}

// Definisikan tipe untuk AuthContext
interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  login: (params: { email: string; password: string }) => Promise<void>;
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
    // Ambil sesi pengguna saat pertama kali dimuat
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      }
      setLoading(false);
    };

    getInitialSession();

    // Berlangganan perubahan state otentikasi
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null); // Kosongkan profil jika logout
        setSelectedOrganizationId(null); // Kosongkan organisasi jika logout
      }
      setLoading(false);
    });

    // Cleanup subscription saat komponen unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fungsi untuk mengambil data profil pengguna dari tabel 'profiles'
  const fetchProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } else if (data) {
        setProfile(data as UserProfile);
        // Atur organisasi terpilih default ke organisasi pengguna saat profil dimuat
        setSelectedOrganizationId(data.organization_id);
      }
    } catch (e) {
      console.error("An unexpected error occurred while fetching profile:", e);
      setProfile(null);
    }
  };
  

  // Fungsi login
  const login = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      throw error;
    }
    setUser(data.user ?? null);
    if (data.user) {
      await fetchProfile(data.user);
    }
    setLoading(false);
  };

  // Fungsi logout
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
