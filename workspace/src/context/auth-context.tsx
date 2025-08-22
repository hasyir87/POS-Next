
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserProfile, Organization } from '@/types/database';

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
  supabase: null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
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
        setUser(firebaseUser);
        const userProfile = await fetchUserProfile(firebaseUser);
        setProfile(userProfile);
        
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
        if (!publicRoutes.includes(pathname) && !pathname.startsWith('/dashboard/test')) {
            router.replace('/');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, fetchUserProfile, setSelectedOrganizationId, pathname]);

  const signup = async (values: any) => {
    const { email, password, fullName, organizationName } = values;

    // --- Client-Side Validation ---
    // 1. Check for duplicate organization name
    const orgsRef = collection(db, "organizations");
    const orgQuery = query(orgsRef, where("name", "==", organizationName));
    const orgQuerySnapshot = await getDocs(orgQuery);
    if (!orgQuerySnapshot.empty) {
        throw new Error("Nama organisasi sudah digunakan.");
    }
    
    // --- Client-Side Registration Logic ---
    let userCredential;
    try {
        // Step 1: Create user in Firebase Auth
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // Step 2: Create organization document in Firestore
        const orgCollectionRef = collection(db, 'organizations');
        const orgDocRef = await addDoc(orgCollectionRef, {
            name: organizationName,
            owner_id: newUser.uid,
            is_setup_complete: false,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });

        // Step 3: Create user profile document in Firestore
        const profileDocRef = doc(db, 'profiles', newUser.uid);
        await setDoc(profileDocRef, {
            id: newUser.uid,
            email: newUser.email,
            full_name: fullName,
            organization_id: orgDocRef.id,
            role: 'owner',
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });
        
        // Login will be handled by onAuthStateChanged listener
    } catch (error: any) {
        console.error("Client-side signup error:", error);
        // If user was created but subsequent steps failed, delete the user for cleanup
        if (userCredential) {
            await userCredential.user.delete();
        }
        if (error.code === 'auth/email-already-in-use') {
             throw new Error("Email ini sudah terdaftar.");
        }
        throw new Error(error.message || "Gagal melakukan pendaftaran. Silakan coba lagi.");
    }
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
    supabase: null
  };

  if (loading && !pathname.startsWith('/dashboard/test')) {
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
