
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { firebaseApp } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { UserProfile, Organization } from '@/types/database'; 
import Cookies from 'js-cookie';

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
      
      if (firebaseUser) {
        setUser(firebaseUser);
        const userProfile = await fetchUserProfile(firebaseUser);
        setProfile(userProfile);
        
        const idToken = await firebaseUser.getIdToken();
        Cookies.set('firebase-session-token', idToken, { expires: 1, path: '/' }); // expires in 1 day

        const storedOrgId = localStorage.getItem('selectedOrgId');
        if (storedOrgId) {
            setSelectedOrganizationIdState(storedOrgId);
        } else if (userProfile?.organization_id) {
            setSelectedOrganizationId(userProfile.organization_id);
        }
        
        if (userProfile && userProfile.organizations && !userProfile.organizations.is_setup_complete) {
            router.replace('/dashboard/setup');
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
  }, [router, fetchUserProfile, setSelectedOrganizationId]);

  const signup = async (values: any) => {
    const { email, password, fullName, organizationName } = values;

    const orgsRef = collection(db, "organizations");
    const orgQuery = query(orgsRef, where("name", "==", organizationName));
    const orgQuerySnapshot = await getDocs(orgQuery);
    if (!orgQuerySnapshot.empty) {
        throw new Error("Nama organisasi sudah digunakan.");
    }
    
    let userCredential;
    try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        const orgCollectionRef = collection(db, 'organizations');
        const orgDocRef = await addDoc(orgCollectionRef, {
            name: organizationName,
            owner_id: newUser.uid,
            is_setup_complete: false,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });

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
        
    } catch (error: any) {
        console.error("Client-side signup error:", error);
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
    router.push('/');
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
    refreshProfile
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
