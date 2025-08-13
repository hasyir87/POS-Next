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

  

  // Helper function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, organization_id')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        if (error.code === 'PGRST116') {
          // Profile tidak ditemukan, buat profile default
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: user?.email || null, // Use the current user's email if available
              full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
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


  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          // Validate session is not expired
          const isValidSession = session?.user && session?.expires_at && new Date(session.expires_at * 1000) > new Date();
          
          setUser(isValidSession ? session.user : null);

          if (isValidSession && session.user) {
            await fetchUserProfile(session.user.id);
          } else {
            // Clear profile if no valid session
            setProfile(null);
            setSelectedOrganizationId(null);
            
            // If session is expired, sign out
            if (session?.user && !isValidSession) {
              await supabase.auth.signOut();
            }
          }

          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setSelectedOrganizationId(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);

        if (mounted) {
          setUser(session?.user ?? null);

          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            await fetchUserProfile(session.user.id);
          } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setSelectedOrganizationId(null);
          }

          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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