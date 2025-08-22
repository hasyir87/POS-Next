
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, writeBatch, doc, collection } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { firebaseApp } from '@/lib/firebase/config';
import { initAdminApp } from '@/lib/firebase/admin-config';

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
    // Read organizationId from the request body
    const body = await request.json();
    const organizationId = body.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Bad Request: organizationId is required in the request body.' }, { status: 400 });
    }

    const adminApp = initAdminApp();
    await getAuth(adminApp).verifyIdToken(token);
    
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
