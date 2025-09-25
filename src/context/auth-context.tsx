
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { callFirebaseFunction } from '@/lib/utils';

export type UserRole = 'owner' | 'cashier' | 'admin' | 'superadmin';

export interface Organization {
  id: string;
  name: string;
  is_setup_complete: boolean;
  owner_id: string;
  parent_organization_id?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  organization_id: string;
  role: UserRole;
  avatar_url?: string;
  organization?: Organization;
}

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  login: ({ email, password }: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile | null> {
    if (!firebaseUser) return null;
  
    const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
    const profileDocSnap = await getDoc(profileDocRef);
  
    if (!profileDocSnap.exists()) {
      console.error("User profile does not exist in Firestore for UID:", firebaseUser.uid);
      return null;
    }
  
    const profileData = { id: profileDocSnap.id, ...profileDocSnap.data() } as UserProfile;
  
    if (profileData.organization_id) {
        const orgDocRef = doc(db, 'organizations', profileData.organization_id);
        const orgDocSnap = await getDoc(orgDocRef);
    
        if (orgDocSnap.exists()) {
            profileData.organization = { id: orgDocSnap.id, ...orgDocSnap.data() } as Organization;
        } else {
             console.error(`Organization with ID ${profileData.organization_id} not found.`);
             profileData.organization = { id: profileData.organization_id, name: 'Organisasi Tidak Ditemukan', is_setup_complete: false, owner_id: profileData.id };
        }
    } else {
        console.error(`User ${profileData.id} has no organization_id.`);
        profileData.organization = { id: '', name: 'Tidak Ada Organisasi', is_setup_complete: false, owner_id: profileData.id };
    }
    
    return profileData;
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(null);

  const setSelectedOrganizationId = useCallback((orgId: string | null) => {
    try {
      if (orgId) {
        localStorage.setItem('selectedOrgId', orgId);
      } else {
        localStorage.removeItem('selectedOrgId');
      }
      setSelectedOrganizationIdState(orgId);
    } catch (error) {
      console.error("Could not access localStorage. Running in a non-browser environment?");
    }
  }, []);
  
  const handleLogout = useCallback(async (message?: {title: string, description: string}) => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setSelectedOrganizationId(null);
    if (message) {
      toast({
        variant: "destructive",
        title: message.title,
        description: message.description,
      });
    }
    router.push('/');
  }, [setSelectedOrganizationId, toast, router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
            const userProfile = await fetchUserProfile(firebaseUser);
            
            if (!userProfile) {
                await handleLogout({title: "Sesi Tidak Valid", description: "Profil pengguna tidak ditemukan. Sesi diakhiri."});
                setLoading(false);
                return;
            }

            setUser(firebaseUser);
            setProfile(userProfile);
            
            const storedOrgId = localStorage.getItem('selectedOrgId');
            if (storedOrgId) {
                setSelectedOrganizationIdState(storedOrgId);
            } else if (userProfile.organization_id) {
                setSelectedOrganizationIdState(userProfile.organization_id);
                localStorage.setItem('selectedOrgId', userProfile.organization_id);
            }

        } catch (error: any) {
            console.error("Auth state change error:", error.message);
            await handleLogout({title: "Sesi Tidak Valid", description: "Gagal memuat data profil. Sesi diakhiri."});
        }
      } else {
        setUser(null);
        setProfile(null);
        setSelectedOrganizationId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [handleLogout, router]);

  const login = async ({ email, password }: { email: string, password: string }) => {
    const { customToken } = await callFirebaseFunction("signInUser", { email, password });
    if (!customToken) {
      throw new Error("Gagal mendapatkan token autentikasi.");
    }
    await signInWithCustomToken(auth, customToken);
  };
  
  const refreshProfile = useCallback(async () => {
    if (user) {
        try {
            const refreshedProfile = await fetchUserProfile(user);
            setProfile(refreshedProfile);
        } catch (error) {
            console.error("Failed to refresh profile:", error);
            await handleLogout({title: "Gagal Memuat Ulang", description: "Tidak dapat memuat ulang data profil. Sesi diakhiri."});
        }
    }
  }, [user, handleLogout]);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    selectedOrganizationId,
    setSelectedOrganizationId,
    login,
    logout: () => handleLogout(),
    refreshProfile,
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
