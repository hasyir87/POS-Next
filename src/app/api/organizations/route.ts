
import { createClient } from '../../../utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { handleSupabaseError } from '@/lib/utils/error';

type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    // Perubahan Kunci: Jika profil tidak ditemukan, jangan lempar error.
    // Kembalikan saja array kosong karena kemungkinan profil sedang dibuat.
    // Frontend akan menangani state kosong ini.
    if (profileError || !profile) {
      console.warn(`Profile not found for user ${user.id} when fetching organizations. Returning empty array.`);
      return NextResponse.json([]);
    }

    let query = supabase.from('organizations').select('*');

    if (profile.role !== 'superadmin') {
       if (!profile.organization_id) {
         // Jika user tidak punya org, kembalikan array kosong.
         return NextResponse.json([]);
      }
      // Ambil organisasi utama PENGGUNA, bukan outlet yang dipilih.
      const { data: mainOrg, error: mainOrgError } = await supabase
        .from('organizations')
        .select('id, parent_organization_id')
        .eq('id', profile.organization_id)
        .single();
      
      if(mainOrgError || !mainOrg) {
        console.error('Error fetching main organization for user:', mainOrgError);
        return NextResponse.json([]);
      }

      // Tentukan ID organisasi induk (atau diri sendiri jika itu adalah induk)
      const parentOrgId = mainOrg.parent_organization_id || mainOrg.id;
      
      // Ambil organisasi induk DAN semua anaknya (outlet)
      query = query.or(`id.eq.${parentOrgId},parent_organization_id.eq.${parentOrgId}`);
    }
    
    const { data: organizations, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json(
        { error: handleSupabaseError(error) },
        { status: 500 }
      )
    }

    return NextResponse.json(organizations || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/organizations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found for user.' }, { status: 404 });
    }

    // Authorization: Only owners or superadmins can create organizations/outlets
    if (profile.role !== 'owner' && profile.role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to create organizations.' }, { status: 403 });
    }
    
    const body: OrganizationInsert = await request.json()

    // If the user is an owner, ensure they are creating an outlet under their own organization
    if (profile.role === 'owner' && profile.organization_id) {
        body.parent_organization_id = profile.organization_id;
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating organization:', error)
      return NextResponse.json(
        { error: handleSupabaseError(error) },
        { status: 500 }
      )
    }

    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
