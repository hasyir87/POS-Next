
// This route is deprecated and its logic is now inside the User page component.
// It can be deleted, but we'll keep it for reference for now.
import { NextResponse } from 'next/server';

export async function PUT() {
  return NextResponse.json({ message: 'This API route is deprecated.' }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ message: 'This API route is deprecated.' }, { status: 410 });
}
