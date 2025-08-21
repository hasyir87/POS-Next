
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserProfile, Organization, UserRole } from '@/types/database'; 

// Initialize Firebase services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (orgId: string | null) => void;
  signup: (values: any) => Promise<void>;
  login: ({ email, password }: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
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

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    if (!firebaseUser) return null;
    const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
    const profileDocSnap = await getDoc(profileDocRef);
    if (profileDocSnap.exists()) {
      return profileDocSnap.data() as UserProfile;
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userProfile = await fetchUserProfile(firebaseUser);
        setProfile(userProfile);
        
        // Handle organization selection
        const storedOrgId = localStorage.getItem('selectedOrgId');
        if (storedOrgId) {
            setSelectedOrganizationIdState(storedOrgId);
        } else if (userProfile?.organization_id) {
            setSelectedOrganizationId(userProfile.organization_id);
        }

        router.replace('/dashboard');
      } else {
        setUser(null);
        setProfile(null);
        setSelectedOrganizationId(null);
        router.replace('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, fetchUserProfile, setSelectedOrganizationId]);

  const signup = async (values: any) => {
    const { email, password, fullName, organizationName } = values;

    // Check if organization name is unique
    const orgsRef = collection(db, "organizations");
    const q = query(orgsRef, where("name", "==", organizationName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error("Nama organisasi sudah digunakan.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Create organization document
    const orgDocRef = doc(collection(db, 'organizations'));
    const organizationData: Organization = {
      id: orgDocRef.id,
      name: organizationName,
      is_setup_complete: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await setDoc(orgDocRef, organizationData);

    // Create user profile document
    const profileData: UserProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      full_name: fullName,
      role: 'owner',
      organization_id: orgDocRef.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      avatar_url: null,
    };
    await setDoc(doc(db, 'profiles', firebaseUser.uid), profileData);
  };

  const login = async ({ email, password }: { email: string, password: string }) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
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
    logout,
    fetchWithAuth,
    refreshProfile,
    supabase: {} as any // Dummy property to prevent type errors in components that will be refactored
  };

  if (loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
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
