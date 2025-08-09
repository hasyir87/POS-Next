// src/app/api/users/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Pastikan SERVICE_ROLE_KEY_SUPABASE tersedia di environment variables Anda!
const serviceRoleSupabase = createRouteHandlerClient({ cookies: cookies(), supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE });

// API Route untuk mendapatkan detail pengguna tunggal (Opsional, bisa pakai GET di /api/users)
// export async function GET(req: Request, { params }: { params: { id: string } }) {
//     const userId = params.id;
//     const cookieStore = cookies();
//     const supabase = createRouteHandlerClient({ cookies: cookieStore });
//
//     // Implementasi serupa dengan GET di /api/users, tapi filter berdasarkan userId
//     // ... pemeriksaan izin ...
//     // const { data: userProfile, error } = await supabase.from('profiles').select('*, organizations(name)').eq('id', userId).single();
//     // ... respon ...
// }


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
     // Untuk sederhana, asumsikan admin/owner hanya bisa memperbarui user di organisasi tempat admin itu sendiri berada.
     // Superadmin bisa memperbarui user di organisasi mana pun.
     if (requestingProfile.role !== 'superadmin' && requestingProfile.organization_id !== targetProfile.organization_id) {
          return NextResponse.json({ error: 'Forbidden: Cannot update user in a different organization' }, { status: 403 });
     }

      // Periksa izin: Mencegah admin/owner biasa mengubah peran superadmin atau owner lain
      if (requestingProfile.role !== 'superadmin') {
          if (targetProfile.role === 'superadmin' || targetProfile.role === 'owner') {
               return NextResponse.json({ error: 'Forbidden: Cannot modify superadmin or owner roles' }, { status: 403 });
          }
          // Jika mencoba menetapkan peran superadmin atau owner
           if (role === 'superadmin' || role === 'owner') {
                return NextResponse.json({ error: 'Forbidden: Cannot assign superadmin or owner roles' }, { status: 403 });
           }
           // Jika mencoba mengubah organization_id (untuk admin/owner)
            if (organization_id !== undefined && organization_id !== targetProfile.organization_id) {
                return NextResponse.json({ error: 'Forbidden: Cannot change organization for user' }, { status: 403 });
            }
      }


    // --- Perbarui Profil Pengguna ---
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    // Hati-hati: Mengizinkan perubahan organization_id mungkin memerlukan logika dan izin yang lebih kompleks

    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating user profile:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
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
          // Pengguna tidak ditemukan di profiles, mungkin hanya di auth.users?
          // Masih bisa dihapus dari auth.users jika requesting user superadmin?
           if (requestingProfile.role === 'superadmin') {
               // Lanjutkan untuk mencoba menghapus dari auth.users
           } else {
               return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
           }
     } else {
          // Periksa izin: Admin/Owner hanya bisa menghapus user di organisasi mereka sendiri atau Outlet mereka.
          // Superadmin bisa menghapus user di organisasi mana pun.
          if (requestingProfile.role !== 'superadmin' && requestingProfile.organization_id !== targetProfile.organization_id) {
               return NextResponse.json({ error: 'Forbidden: Cannot delete user in a different organization' }, { status: 403 });
          }

           // Periksa izin: Mencegah admin/owner biasa menghapus superadmin atau owner lain
            if (requestingProfile.role !== 'superadmin') {
               if (targetProfile.role === 'superadmin' || targetProfile.role === 'owner') {
                    return NextResponse.json({ error: 'Forbidden: Cannot delete superadmin or owner roles' }, { status: 403 });
               }
            }
     }

    // --- Hapus Pengguna dari Supabase Auth (ini juga akan memicu penghapusan di profiles jika ada cascade delete) ---
    // Penting: Pastikan ada RLS policy atau database constraint yang menangani penghapusan di profiles
    // jika pengguna dihapus dari auth.users. CASCADE DELETE di foreign key organization_id di profiles
    // ke organization_id di organizations BUKAN yang kita inginkan. Yang kita inginkan adalah CASCADE DELETE
    // dari auth.users ke profiles.

     // Cara yang lebih aman adalah hapus dulu dari profiles, lalu dari auth.users
     if (targetProfile) { // Jika profil ada, hapus dari profiles dulu
          const { error: deleteProfileError } = await supabase
               .from('profiles')
               .delete()
               .eq('id', userId);

          if (deleteProfileError) {
               console.error('Error deleting user profile:', deleteProfileError.message);
               return NextResponse.json({ error: deleteProfileError.message }, { status: 500 });
          }
     }


    const { data: deletedUserAuth, error: deleteAuthError } = await serviceRoleSupabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
        console.error('Error deleting Supabase Auth user:', deleteAuthError.message);
        return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
    }

    // --- Berhasil ---
    return NextResponse.json({ message: 'User deleted successfully' });
}
