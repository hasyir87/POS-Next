
// This API route has been deprecated and its logic moved to a Firebase Cloud Function
// for better security and reliability. The new function is `setupInitialData`
// in `functions/src/index.ts`. The setup page now calls this function directly.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Please use the setupInitialData cloud function.' },
    { status: 410 }
  );
}
