
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { handleSupabaseError } from '@/lib/utils/error';

async function getPrimaryOwnerId(supabaseAdmin: ReturnType<typeof createClient>, organizationId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('role', 'owner')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }
    return data.id;
}


// API Route untuk memperbarui detail pengguna (misalnya, peran atau nama)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const targetUserId = params.id; // ID pengguna yang akan diperbarui
    const { full_name, role } = await req.json(); // Data yang akan diperbarui

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
     
     // Superadmin bisa melakukan apa saja
     if (requestingProfile.role !== 'superadmin') {
        // Periksa izin: Hanya 'owner' atau 'admin' dari organisasi yang bisa memperbarui pengguna
        if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to update users' }, { status: 403 });
        }

        // Dapatkan profil pengguna yang akan diperbarui untuk pemeriksaan tambahan
        const { data: targetProfile, error: targetProfileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', targetUserId)
            .single();

        if (targetProfileError || !targetProfile) {
            return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
        }
        
        // Admin/Owner hanya bisa memperbarui user di organisasi mereka sendiri.
        if (requestingProfile.organization_id !== targetProfile.organization_id) {
            return NextResponse.json({ error: 'Forbidden: Cannot update user in a different organization' }, { status: 403 });
        }
        
        // Dapatkan ID pemilik utama
        const primaryOwnerId = await getPrimaryOwnerId(supabase, requestingProfile.organization_id);

        // Mencegah siapapun (kecuali superadmin) mengubah data pemilik utama
        if (targetUserId === primaryOwnerId) {
             return NextResponse.json({ error: 'Forbidden: The primary owner account cannot be modified.' }, { status: 403 });
        }
        
        // Mencegah admin biasa mengubah peran menjadi owner
        if (requestingProfile.role === 'admin' && role === 'owner') {
             return NextResponse.json({ error: 'Forbidden: Admins cannot assign the owner role.' }, { status: 403 });
        }
     }


    // --- Perbarui Profil Pengguna ---
    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;

    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', targetUserId)
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
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const serviceRoleSupabase = createClient(cookieStore);
    // Note: To use service_role key for admin actions, you'd typically have a separate client initialization
    // For simplicity in this protected route, we assume the RLS allows owners to delete.
    // A more robust solution might use an RPC function `delete_user(user_id)`.

    const targetUserId = params.id; // ID pengguna yang akan dihapus

     // --- Pemeriksaan Izin Pengguna yang Request ---
     const { data: { user: requestingUser }, error: requestingUserError } = await supabase.auth.getUser();

     if (requestingUserError || !requestingUser) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
     
     // Mencegah pengguna menghapus dirinya sendiri
     if (requestingUser.id === targetUserId) {
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
     
     // Superadmin bisa melakukan apa saja
     if (requestingProfile.role !== 'superadmin') {
        // Periksa izin: Hanya 'owner' yang bisa menghapus pengguna
        if (requestingProfile.role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden: Only owners can delete users' }, { status: 403 });
        }

        // Dapatkan profil pengguna yang akan dihapus untuk pemeriksaan tambahan
        const { data: targetProfile, error: targetProfileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', targetUserId)
            .single();

        if (targetProfileError || !targetProfile) {
            return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
        }
        
        // Owner hanya bisa menghapus user di organisasi mereka sendiri.
        if (requestingProfile.organization_id !== targetProfile.organization_id) {
            return NextResponse.json({ error: 'Forbidden: Cannot delete user in a different organization' }, { status: 403 });
        }
        
        // Dapatkan ID pemilik utama
        const primaryOwnerId = await getPrimaryOwnerId(supabase, requestingProfile.organization_id);

        // Mencegah siapapun (termasuk owner lain) menghapus pemilik utama
        if (targetUserId === primaryOwnerId) {
             return NextResponse.json({ error: 'Forbidden: The primary owner account cannot be deleted.' }, { status: 403 });
        }
     }
     
    // --- Hapus Pengguna dari Supabase Auth (CASCADE akan menghapus profil) ---
    // This requires a service_role client. The RLS should be set up to allow this.
    // For now, let's assume RLS is permissive for owners or this is an admin action.
    // In production, an RPC function is safer.
    
    // WARNING: This will likely fail unless RLS is configured to allow users to delete others.
    // The safe way is an RPC or using a service role key.
    // const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(targetUserId);
    
    // For now, we will just delete the profile, which is safer with RLS. The auth user will remain.
    const { error: deleteProfileError } = await supabase.from('profiles').delete().eq('id', targetUserId);


    if (deleteProfileError) {
        console.error('Error deleting user profile:', deleteProfileError);
        return NextResponse.json({ error: handleSupabaseError(deleteProfileError) }, { status: 500 });
    }

    // --- Berhasil ---
    return NextResponse.json({ message: 'User profile deleted successfully. Auth user may still exist.' });
}
