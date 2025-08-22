
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserProfile, Organization } from '@/types/database';
import Cookies from 'js-cookie';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';


// Initialize Firebase services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp);

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  signup: (values: any) => Promise<any>;
  login: ({ email, password }: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<string | null>(null);

  const setSelectedOrganizationId = useCallback((orgId: string | null) => {
    if (orgId) {
      localStorage.setItem('selectedOrgId', orgId);
    } else {
      localStorage.removeItem('selectedOrgId');
    }
    setSelectedOrganizationIdState(orgId);
  }, []);
  
  const handleLogout = useCallback(async (message?: string) => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setSelectedOrganizationId(null);
    Cookies.remove('firebase-session-token');
    router.push('/');
    if (message) {
      toast({
        variant: "destructive",
        title: "Sesi Tidak Valid",
        description: message,
      });
    }
  }, [router, setSelectedOrganizationId, toast]);

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser | null): Promise<UserProfile | null> => {
    if (!firebaseUser) return null;
    const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
    const profileDocSnap = await getDoc(profileDocRef);
    if (profileDocSnap.exists()) {
        const profileData = { id: profileDocSnap.id, ...profileDocSnap.data() } as UserProfile;
        
        if (profileData.organization_id) {
            const orgDocRef = doc(db, 'organizations', profileData.organization_id);
            const orgDocSnap = await getDoc(orgDocRef);
            if (orgDocSnap.exists()) {
                profileData.organizations = { id: orgDocSnap.id, ...orgDocSnap.data() } as Organization;
            }
        }
        return profileData;
    }
    return null;
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      const publicRoutes = ['/', '/signup', '/unauthorized'];
      
      if (firebaseUser) {
        const userProfile = await fetchUserProfile(firebaseUser);

        if (!userProfile) {
            console.error("Auth user exists but profile data is missing. Logging out.");
            await handleLogout("Data profil Anda tidak ditemukan. Sesi diakhiri.");
            setLoading(false);
            return;
        }

        setUser(firebaseUser);
        setProfile(userProfile);
        
        const idToken = await firebaseUser.getIdToken();
        Cookies.set('firebase-session-token', idToken, { expires: 1, path: '/' });

        const storedOrgId = localStorage.getItem('selectedOrgId');
        if (storedOrgId) {
            setSelectedOrganizationIdState(storedOrgId);
        } else if (userProfile?.organization_id) {
            setSelectedOrganizationId(userProfile.organization_id);
        }
        
        if (userProfile && userProfile.organizations && !userProfile.organizations.is_setup_complete && pathname !== '/dashboard/setup') {
            router.replace('/dashboard/setup');
        } else if (publicRoutes.includes(pathname)) {
            router.replace('/dashboard');
        }

      } else {
        setUser(null);
        setProfile(null);
        setSelectedOrganizationId(null);
        Cookies.remove('firebase-session-token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, fetchUserProfile, setSelectedOrganizationId, pathname, handleLogout]);

  const signup = async (values: any) => {
    const { email, password, fullName, organizationName } = values;
    const createOwner = httpsCallable(functions, 'createOwner');
    try {
      const result = await createOwner({ email, password, fullName, organizationName });
      return result.data;
    } catch (error: any) {
      console.error("Cloud function 'createOwner' error:", error);
      throw new Error(error.message || "Gagal melakukan pendaftaran. Silakan coba lagi.");
    }
  };

  const login = async ({ email, password }: { email: string, password: string }) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
      const idToken = await user?.getIdToken();
      
      const headers = new Headers(options.headers || {});
      if (idToken) {
          headers.set('Authorization', `Bearer ${idToken}`);
      }
      return fetch(url, { ...options, headers });
  };
  
  const refreshProfile = useCallback(async () => {
    if (user) {
        const refreshedProfile = await fetchUserProfile(user);
        setProfile(refreshedProfile);
    }
  }, [user, fetchUserProfile]);


  const value = {
    user,
    profile,
    loading,
    selectedOrganizationId,
    setSelectedOrganizationId,
    signup,
    login,
    logout: handleLogout,
    fetchWithAuth,
    refreshProfile,
  };

  if (loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
