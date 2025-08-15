// src/app/api/users/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { handleSupabaseError } from '@/lib/utils/error';

// API Route untuk memperbarui detail pengguna (misalnya, peran atau nama)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const userId = params.id; // ID pengguna yang akan diperbarui
    const { name, role, organization_id } = await req.json(); // Data yang akan diperbarui

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: cookieStore });

    // --- Pemeriksaan Izin Pengguna yang Request ---
     const { data: { user: requestingUser }, error: requestingUserError } = await supabase.auth.getUser();

     if (requestingUserError || !requestingUser) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     const { data: requestingProfile, error: requestingProfileError } = await supabase
         .from('profiles')
         .select('organization_id, role')
         .eq('id', requestingUser.id)
         .single();

     if (requestingProfileError || !requestingProfile || !requestingProfile.organization_id) {
          return NextResponse.json({ error: 'Requesting user profile not found or not associated with an organization' }, { status: 404 });
     }

     // Periksa izin: Hanya 'owner' atau 'admin' dari organisasi yang bisa memperbarui pengguna
     if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin' && requestingProfile.role !== 'superadmin') {
          return NextResponse.json({ error: 'Forbidden: Only owners, admins, or superadmin can update users' }, { status: 403 });
     }

     // Dapatkan profil pengguna yang akan diperbarui untuk pemeriksaan tambahan
     const { data: targetProfile, error: targetProfileError } = await supabase
          .from('profiles')
          .select('organization_id, role')
          .eq('id', userId)
          .single();

     if (targetProfileError || !targetProfile) {
          return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
     }

     // Periksa izin: Admin/Owner hanya bisa memperbarui user di organisasi mereka sendiri atau Outlet mereka.
     // Superadmin bisa memperbarui user di organisasi mana pun.
     if (requestingProfile.role !== 'superadmin' && requestingProfile.organization_id !== targetProfile.organization_id) {
          return NextResponse.json({ error: 'Forbidden: Cannot update user in a different organization' }, { status: 403 });
     }

      // Periksa izin: Mencegah admin/owner biasa mengubah peran superadmin atau owner lain
      if (requestingProfile.role !== 'superadmin') {
          if (targetProfile.role === 'superadmin' || targetProfile.role === 'owner') {
               return NextResponse.json({ error: 'Forbidden: Cannot modify superadmin or owner roles' }, { status: 403 });
          }
           if (role === 'superadmin' || role === 'owner') {
                return NextResponse.json({ error: 'Forbidden: Cannot assign superadmin or owner roles' }, { status: 403 });
           }
      }


    // --- Perbarui Profil Pengguna ---
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (organization_id !== undefined && requestingProfile.role === 'superadmin') {
        // Hanya superadmin yang bisa mengubah organisasi pengguna
        updateData.organization_id = organization_id;
    }


    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating user profile:', updateError);
        return NextResponse.json({ error: handleSupabaseError(updateError) }, { status: 500 });
    }

    // --- Berhasil ---
    return NextResponse.json(updatedProfile);
}


// API Route untuk menghapus pengguna
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const userId = params.id; // ID pengguna yang akan dihapus

    // Perlu Service Role Key untuk menghapus user di auth.users
    const serviceRoleSupabase = createRouteHandlerClient({ cookies: cookies(), supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE });

    // --- Pemeriksaan Izin Pengguna yang Request ---
     const cookieStore = cookies();
     const supabase = createRouteHandlerClient({ cookies: cookieStore });
     const { data: { user: requestingUser }, error: requestingUserError } = await supabase.auth.getUser();

     if (requestingUserError || !requestingUser) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     // Mencegah pengguna menghapus dirinya sendiri
     if (requestingUser.id === userId) {
        return NextResponse.json({ error: 'Forbidden: You cannot delete your own account.' }, { status: 403 });
     }

     const { data: requestingProfile, error: requestingProfileError } = await supabase
         .from('profiles')
         .select('organization_id, role')
         .eq('id', requestingUser.id)
         .single();

     if (requestingProfileError || !requestingProfile || !requestingProfile.organization_id) {
          return NextResponse.json({ error: 'Requesting user profile not found or not associated with an organization' }, { status: 404 });
     }

    // Periksa izin: Hanya 'owner' atau 'admin' dari organisasi yang bisa menghapus pengguna
    if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin' && requestingProfile.role !== 'superadmin') {
         return NextResponse.json({ error: 'Forbidden: Only owners, admins, or superadmin can delete users' }, { status: 403 });
    }

    // Dapatkan profil pengguna yang akan dihapus untuk pemeriksaan tambahan
     const { data: targetProfile, error: targetProfileError } = await supabase
          .from('profiles')
          .select('organization_id, role')
          .eq('id', userId)
          .single();

     if (targetProfileError || !targetProfile) {
        return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
     }
    
    // Periksa izin: Admin/Owner hanya bisa menghapus user di organisasi mereka sendiri.
    if (requestingProfile.role !== 'superadmin' && requestingProfile.organization_id !== targetProfile.organization_id) {
        return NextResponse.json({ error: 'Forbidden: Cannot delete user in a different organization' }, { status: 403 });
    }

    // Periksa izin: Mencegah admin/owner biasa menghapus superadmin atau owner lain
    if (requestingProfile.role !== 'superadmin') {
        if (targetProfile.role === 'superadmin' || targetProfile.role === 'owner') {
            return NextResponse.json({ error: 'Forbidden: Cannot delete superadmin or owner roles' }, { status: 403 });
        }
    }
     
    // --- Hapus Pengguna dari Supabase Auth ---
    // ON DELETE CASCADE yang kita atur di foreign key profiles.id akan otomatis menghapus record di profiles
    const { data: deletedUserAuth, error: deleteAuthError } = await serviceRoleSupabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
        console.error('Error deleting Supabase Auth user:', deleteAuthError);
        return NextResponse.json({ error: handleSupabaseError(deleteAuthError) }, { status: 500 });
    }

    // --- Berhasil ---
    return NextResponse.json({ message: 'User deleted successfully' });
}
