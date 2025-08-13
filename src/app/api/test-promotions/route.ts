
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY_SUPABASE!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test direct query to promotions table
    const { data: promotions, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Promotions query error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      });
    }

    return NextResponse.json({
      success: true,
      message: `Found ${promotions?.length || 0} promotions`,
      data: promotions || [],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Test promotions error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    });
  }
}
