
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, Timestamp, startOfDay, endOfDay } from 'firebase/firestore';
import { firebaseApp, firebaseAuth } from '@/lib/firebase/config';
import { getAuth } from 'firebase-admin/auth';
import { initAdminApp } from '@/lib/firebase/admin-config';

async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.split('Bearer ')[1];
  if (!token) return null;
  try {
    const adminApp = initAdminApp();
    const decodedToken = await getAuth(adminApp).verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
  }

  try {
    const db = getFirestore(firebaseApp);
    const today = new Date();
    const startOfToday = startOfDay(today);
    
    // Daily Revenue & Sales Count
    const transactionsRef = collection(db, 'transactions');
    const todayTransactionsQuery = query(
      transactionsRef,
      where('organization_id', '==', organizationId),
      where('created_at', '>=', Timestamp.fromDate(startOfToday))
    );
    const todayTransactionsSnap = await getDocs(todayTransactionsQuery);
    
    let dailyRevenue = 0;
    todayTransactionsSnap.forEach(doc => {
      dailyRevenue += doc.data().total_amount;
    });
    const dailySalesCount = todayTransactionsSnap.size;

    // New Customers Today
    const customersRef = collection(db, 'customers');
    const newCustomersQuery = query(
        customersRef,
        where('organization_id', '==', organizationId),
        where('created_at', '>=', Timestamp.fromDate(startOfToday))
    );
    const newCustomersSnap = await getDocs(newCustomersQuery);
    const newCustomersToday = newCustomersSnap.size;

    // Top Selling Products (This is a simplified version. A real implementation might need a more complex query or a separate collection for aggregated data)
    // For now, we return mock data for this part.
    const topProducts = [
        { name: 'Ocean Breeze', sales: 23 },
        { name: 'Mystic Woods', sales: 18 },
    ];


    return NextResponse.json({
      dailyRevenue,
      dailySalesCount,
      newCustomersToday,
      topProducts,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
