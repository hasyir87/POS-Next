// src/app/api/users/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Pastikan SERVICE_ROLE_KEY_SUPABASE tersedia di environment variables Anda!
const serviceRoleSupabase = createRouteHandlerClient({ cookies: cookies(), supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE });


// API Route untuk mendapatkan daftar pengguna di organisasi yang sama
export async function GET(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: cookieStore });

   // Dapatkan ID organisasi pengguna yang sedang request
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

  if (profileError || !profile || !profile.organization_id) {
       return NextResponse.json({ error: 'User profile not found or not associated with an organization' }, { status: 404 });
  }

  // Periksa apakah pengguna memiliki izin untuk melihat daftar pengguna
  // Misalnya, hanya 'owner' atau 'admin' yang bisa melihat semua pengguna di organisasi mereka.
  // 'superadmin' bisa melihat semua pengguna, tapi logic ini mungkin perlu di API terpisah.
  if (profile.role !== 'owner' && profile.role !== 'admin' && profile.role !== 'superadmin') {
       return NextResponse.json({ error: 'Forbidden: Only authorized roles can view users' }, { status: 403 });
  }

  let usersInOrg = [];
  let error = null;

  if (profile.role === 'superadmin') {
       // Superadmin melihat semua profil (hati-hati dengan RLS!)
       // Mungkin perlu query yang lebih canggih atau API terpisah untuk superadmin view
       const { data, error: fetchError } = await supabase
           .from('profiles')
           .select('*, organizations(name)'); // Join dengan tabel organizations jika perlu
       usersInOrg = data || [];
       error = fetchError;

  } else {
      // Owner/Admin melihat semua profil di organisasi mereka
       const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', profile.organization_id);
      usersInOrg = data || [];
      error = fetchError;
  }


  if (error) {
    console.error('Error fetching users:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Anda mungkin tidak ingin mengembalikan semua data profil, filter sesuai kebutuhan
  return NextResponse.json(usersInOrg);
}

// API Route untuk mengundang/membuat pengguna baru
export async function POST(req: Request) {
  const { email, password, name, role, organization_id } = await req.json(); // password bisa opsional jika menggunakan invite

  // Perlu Service Role Key untuk operasi admin
   const serviceRoleSupabase = createRouteHandlerClient({ cookies: cookies(), supabaseKey: process.env.SERVICE_ROLE_KEY_SUPABASE });


   // Dapatkan profil pengguna yang sedang request
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


   // Periksa izin: Hanya 'owner' atau 'admin' dari organisasi yang bisa menambah pengguna
   if (requestingProfile.role !== 'owner' && requestingProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only owners or admins can add users' }, { status: 403 });
   }

    // Periksa izin: Admin/Owner hanya bisa menambah user ke organisasi mereka sendiri atau Outlet mereka.
    // Logic ini bisa menjadi kompleks tergantung seberapa jauh admin bisa menambah user.
    // Untuk sederhana, asumsikan hanya bisa menambah ke organisasi tempat admin itu sendiri berada.
    if (organization_id !== requestingProfile.organization_id) {
         return NextResponse.json({ error: 'Forbidden: Cannot add user to a different organization' }, { status: 403 });
    }

    // Periksa apakah peran yang diberikan valid dan diizinkan oleh peran pengguna yang request
    // Misalnya, admin tidak bisa membuat superadmin atau owner lain.
    const allowedRoles = ['cashier']; // Sesuaikan peran yang bisa ditambahkan oleh admin/owner
    if (!allowedRoles.includes(role) && role !== 'admin' && role !== 'owner' && requestingProfile.role !== 'superadmin') {
         return NextResponse.json({ error: `Forbidden: Cannot assign role "${role}"` }, { status: 403 });
    }
     if (role === 'owner' && requestingProfile.role !== 'superadmin') {
          return NextResponse.json({ error: 'Forbidden: Only superadmin can assign owner role' }, { status : 403 });
     }


   // --- Langkah 1: Buat Pengguna di Supabase Auth ---
   let userAuthData;
   let authError;

   // Anda bisa menggunakan createUserWithPassword (membutuhkan password)
   // atau inviteUserByEmail (mengirim link undangan)
   if (password) {
        ({ data: userAuthData, error: authError } = await serviceRoleSupabase.auth.admin.createUser({
           email,
           password,
           email_confirm: true, // Atur ke false jika tidak ingin konfirmasi email
        }));
   } else {
       ({ data: userAuthData, error: authError } = await serviceRoleSupabase.auth.admin.inviteUserByEmail(email));
   }


   if (authError) {
     console.error('Error creating/inviting Supabase Auth user:', authError.message);
     return NextResponse.json({ error: authError.message }, { status: 500 });
   }

   if (!userAuthData?.user) {
       return NextResponse.json({ error: 'Supabase Auth user creation/invitation failed unexpectedly.' }, { status: 500 });
   }


   // --- Langkah 2: Buat Profil Pengguna dan Hubungkan ke Organisasi ---
   const { data: newUserProfile, error: profileError } = await supabase
     .from('profiles')
     .insert([
       {
         id: userAuthData.user.id, // ID dari Supabase Auth
         name: name || email, // Gunakan nama yang diberikan atau email
         role: role || 'cashier', // Gunakan role yang diberikan atau default
         organization_id: organization_id // Hubungkan ke organisasi yang ditentukan
       }
     ])
     .select()
     .single();


   if (profileError) {
     console.error('Error creating user profile:', profileError.message);
      // Pertimbangkan untuk menghapus user di auth.users jika pembuatan profil gagal
     await serviceRoleSupabase.auth.admin.deleteUser(userAuthData.user.id);
     return NextResponse.json({ error: profileError.message }, { status: 500 });
   }

   // --- Berhasil ---
   return NextResponse.json(newUserProfile, { status: 201 });
}
