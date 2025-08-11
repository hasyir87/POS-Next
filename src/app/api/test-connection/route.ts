import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/test-connection'

export async function GET() {
  try {
    const isConnected = await testConnection()
    
    return NextResponse.json({
      success: isConnected,
      message: isConnected ? 'Connected to Supabase!' : 'Failed to connect'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error testing connection'
    }, { status: 500 })
  }
}
