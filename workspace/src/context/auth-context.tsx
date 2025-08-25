
"use client";

import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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
  login: ({ email, password }: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile | null> => {
    try {
      const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
      const profileDocSnap = await getDoc(profileDocRef);

      if (profileDocSnap.exists()) {
        const profileData = { id: profileDocSnap.id, ...profileDocSnap.data() } as UserProfile;
        
        // Also fetch the organization data and attach it to the profile
        if (profileData.organization_id) {
            const orgDocRef = doc(db, 'organizations', profileData.organization_id);
            const orgDocSnap = await getDoc(orgDocRef);
            if (orgDocSnap.exists()) {
                profileData.organizations = { id: orgDocSnap.id, ...orgDocSnap.data() } as Organization;
            }
        }
        return profileData;
      } else {
         // This case might happen if there's a delay in Firestore document creation after signup.
         // We will retry once after a short delay.
        await delay(2000);
        const secondAttemptSnap = await getDoc(profileDocRef);
        if (secondAttemptSnap.exists()) {
           return { id: secondAttemptSnap.id, ...secondAttemptSnap.data() } as UserProfile;
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile = await fetchUserProfile(firebaseUser);
        if (userProfile) {
          setUser(firebaseUser);
          setProfile(userProfile);
          
          const storedOrgId = localStorage.getItem('selectedOrgId');
          // Ensure the storedOrgId is actually one of the user's valid orgs, otherwise default.
          // For now, we default to the user's primary org ID.
          setSelectedOrganizationIdState(storedOrgId || userProfile.organization_id);

          const isSetupComplete = userProfile.organizations?.is_setup_complete ?? false;
          if (!isSetupComplete && pathname !== '/dashboard/setup') {
              router.replace('/dashboard/setup');
          } else if (isSetupComplete && (pathname === '/dashboard/setup' || pathname === '/')) {
              router.replace('/dashboard');
          }

        } else {
          // If profile doesn't exist even after retry, log the user out.
          await signOut(auth);
        }
      } else {
        setUser(null);
        setProfile(null);
        setSelectedOrganizationId(null);
        // If not on a public page, redirect to login
        if (pathname !== '/' && pathname !== '/signup') {
            router.replace('/');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile, pathname, router]);

  const login = async ({ email, password }: { email: string, password: string }) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  
  const logout = async () => {
      await signOut(auth);
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
        const refreshedProfile = await fetchUserProfile(user);
        setProfile(refreshedProfile);
    }
  }, [user, fetchUserProfile]);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    selectedOrganizationId,
    setSelectedOrganizationId,
    login,
    logout,
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
