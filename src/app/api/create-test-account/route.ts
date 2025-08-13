
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Create test organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Toko Test'
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Create test user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'test123456',
      options: {
        data: {
          full_name: 'User Test'
        }
      }
    });

    if (authError) throw authError;

    if (authData.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: 'test@example.com',
          full_name: 'User Test',
          role: 'owner',
          organization_id: orgData.id
        });

      if (profileError) throw profileError;
    }

    return NextResponse.json({ 
      status: 'success', 
      message: 'Test account created successfully',
      email: 'test@mperfumeamal.com',
      password: 'test123456'
    });
  } catch (error: any) {
    console.error('Error creating test account:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error.message || 'Failed to create test account'
      },
      { status: 500 }
    );
  }
}
