
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, writeBatch, doc, collection, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { firebaseApp } from '@/lib/firebase/config';
import { initAdminApp } from '@/lib/firebase/admin-config';
import type { UserProfile } from '@/types/database';

// Helper function to get user profile and verify ownership/role
async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirestore(firebaseApp);
  const profileDoc = await getDoc(doc(db, 'profiles', uid));
  if (profileDoc.exists()) {
    return profileDoc.data() as UserProfile;
  }
  return null;
}

// Initial data for seeding
const initialCategories = [
  { name: 'Bibit Parfum' },
  { name: 'Pelarut' },
  { name: 'Bahan Sintetis' },
  { name: 'Kemasan' },
];

const initialGrades = [
  { name: 'Standard', price_multiplier: 1.0, extra_essence_price: 2000 },
  { name: 'Premium', price_multiplier: 1.5, extra_essence_price: 3500 },
];

const initialUnits = [
    { name: 'ml' },
    { name: 'g' },
    { name: 'pcs' },
];


export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token format' }, { status: 401 });
  }

  try {
    const adminApp = initAdminApp();
    const decodedToken = await getAuth(adminApp).verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const profile = await getUserProfile(userId);
    if (!profile || !profile.organization_id) {
        return NextResponse.json({ error: 'Profile or Organization ID not found for user.' }, { status: 404 });
    }

    if(profile.role !== 'owner') {
        return NextResponse.json({ error: 'Forbidden: Only owners can perform initial setup.' }, { status: 403 });
    }

    const organizationId = profile.organization_id;
    const db = getFirestore(firebaseApp);
    const batch = writeBatch(db);

    // Seed Categories
    initialCategories.forEach(category => {
        const categoryRef = doc(collection(db, 'categories'));
        batch.set(categoryRef, { ...category, organization_id: organizationId });
    });

    // Seed Grades
    initialGrades.forEach(grade => {
        const gradeRef = doc(collection(db, 'grades'));
        batch.set(gradeRef, { ...grade, organization_id: organizationId });
    });
    
    // NOTE: For simplicity, units and brands are managed client-side in settings for now.
    // They can be added here if needed in the future.

    // Mark setup as complete
    const orgRef = doc(db, 'organizations', organizationId);
    batch.update(orgRef, { is_setup_complete: true });

    await batch.commit();

    return NextResponse.json({ status: 'success', message: 'Toko berhasil disiapkan.' });

  } catch (error: any) {
    console.error('Error in setup/seed API:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Sesi telah berakhir, silakan login kembali.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
