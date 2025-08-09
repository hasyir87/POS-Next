'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useRouter } from 'next/navigation';

// Definisikan tipe untuk Organisasi (sesuai tabel Supabase)
interface Organization {
    id: string;
    name: string;
    parent_organization_id: string | null;
    created_at: string;
}

export default function OrganizationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk form tambah Outlet baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [isAddingOutlet, setIsAddingOutlet] = useState(false);
  const [addOutletError, setAddOutletError] = useState<string | null>(null);


  // Efek untuk memuat daftar organisasi saat komponen dimuat
  useEffect(() => {
    // Redirect jika tidak login dan loading selesai
    if (!loading && !user) {
      router.push('/login'); // Arahkan ke halaman login jika belum login
    }

    // Ambil daftar organisasi dari API jika sudah login
    if (user) {
      fetchOrganizations();
    }
  }, [user, loading, router]); // Dependencies efek

  const fetchOrganizations = async () => {
    setIsLoadingOrganizations(true);
    setError(null);
    try {
      const response = await fetch('/api/organizations'); // Panggil API Route GET
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch organizations.');
        console.error('Error fetching organizations:', data.error);
        setOrganizations([]); // Kosongkan daftar jika ada error
      } else {
        setOrganizations(data);
        console.log('Organizations fetched:', data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching organizations.');
      console.error('Fetch organizations error:', err);
       setOrganizations([]); // Kosongkan daftar jika ada error
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  // Handler submit form tambah Outlet
  const handleAddOutlet = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsAddingOutlet(true);
      setAddOutletError(null);

      // Temukan organisasi induk pengguna yang sedang login
      // Ini mengasumsikan pengguna yang login adalah 'owner' atau 'admin'
      // yang terhubung ke organisasi induk (parent_organization_id is NULL).
      // API /api/organizations GET sudah memfilter ini untuk peran tersebut.
      const ownerOrg = organizations.find(org => !org.parent_organization_id); // Cari organisasi induk (parent_organization_id is NULL)

      if (!ownerOrg) {
          setAddOutletError("Could not find the parent organization for the current user. Please ensure your user is associated with a parent organization.");
          setIsAddingOutlet(false);
          return;
      }


      try {
          const response = await fetch('/api/organizations', { // Panggil API Route POST
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  name: newOutletName,
                  parent_organization_id: ownerOrg.id // Kirim ID organisasi induk
              })
          });

          const data = await response.json();

          if (!response.ok) {
              setAddOutletError(data.error || 'Failed to add new outlet.');
              console.error('Error adding outlet:', data.error);
          } else {
              console.log('Outlet added successfully:', data);
              setNewOutletName(''); // Kosongkan input form
              setShowAddForm(false); // Sembunyikan form
              fetchOrganizations(); // Muat ulang daftar organisasi
          }

      } catch (err: any) {
          setAddOutletError(err.message || 'An error occurred while adding the outlet.');
          console.error('Add outlet fetch error:', err);
      } finally {
          setIsAddingOutlet(false);
      }
  };


  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication status...</div>; // Tampilkan loading state dari Auth Context
  }

  // Jika tidak login, useEffect akan mengarahkan ke /login
  if (!user) {
       return null; // Jangan render apa pun sebelum redirect
  }


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Organizations (Outlets)</h1>

      {error && <div className="text-red-500 mb-4">Error: {error}</div>}

      <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
          {showAddForm ? 'Cancel Add Outlet' : 'Add New Outlet'}
      </button>

      {/* Form Tambah Outlet Baru */}
      {showAddForm && (
          <div className="mb-6 p-4 border rounded shadow">
              <h3 className="text-xl font-semibold mb-3">Add New Outlet</h3>
              <form onSubmit={handleAddOutlet}>
                  <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newOutletName">
                          Outlet Name
                      </label>
                      <input
                          type="text"
                          id="newOutletName"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={newOutletName}
                          onChange={(e) => setNewOutletName(e.target.value)}
                          required
                      />
                  </div>
                  {addOutletError && <p className="text-red-500 text-xs italic mb-4">{addOutletError}</p>}
                  <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                      disabled={isAddingOutlet}
                  >
                      {isAddingOutlet ? 'Adding...' : 'Save Outlet'}
                  </button>
              </form>
          </div>
      )}

      {/* Daftar Organisasi */}
      <h3 className="text-xl font-semibold mb-3">Your Organizations</h3>
      {isLoadingOrganizations ? (
          <p>Loading organizations...</p>
      ) : (
          <ul>
              {organizations.length > 0 ? (
                  organizations.map(org => (
                      <li key={org.id} className="mb-2 p-3 border rounded">
                          <div className="font-bold">{org.name}</div>
                          <div className="text-sm text-gray-600">ID: {org.id}</div>
                           {org.parent_organization_id && (
                                <div className="text-sm text-gray-600">This is an Outlet (Parent ID: {org.parent_organization_id})</div>
                           )}
                           {!org.parent_organization_id && (
                                <div className="text-sm text-gray-600 italic">This is a Parent Organization</div>
                           )}
                          {/* TODO: Tambahkan tombol Edit/Delete Outlet jika peran pengguna mengizinkan */}
                      </li>
                  ))
              ) : (
                  <p>No organizations found.</p>
              )}
          </ul>
      )}

      {/* TODO: Tambahkan komponen atau link untuk manajemen pengguna */}
      {/* <h3 className="text-xl font-semibold mb-3 mt-6">Manage Users</h3>
      <Link href="/dashboard/users">
          <a className="text-blue-500 hover:underline">Go to User Management</a>
      </Link> */}

    </div>
  );
}
// src/app/dashboard/organizations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context'; // Sesuaikan path jika berbeda
import { useRouter } from 'next/navigation';

// Definisikan tipe untuk Organisasi (sesuai tabel Supabase)
interface Organization {
    id: string;
    name: string;
    parent_organization_id: string | null;
    created_at: string;
}

export default function OrganizationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State untuk form tambah Outlet baru
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [isAddingOutlet, setIsAddingOutlet] = useState(false);
  const [addOutletError, setAddOutletError] = useState<string | null>(null);


  // Efek untuk memuat daftar organisasi saat komponen dimuat
  useEffect(() => {
    // Redirect jika tidak login dan loading selesai
    if (!loading && !user) {
      router.push('/login'); // Arahkan ke halaman login jika belum login
    }

    // Ambil daftar organisasi dari API jika sudah login
    if (user) {
      fetchOrganizations();
    }
  }, [user, loading, router]); // Dependencies efek

  const fetchOrganizations = async () => {
    setIsLoadingOrganizations(true);
    setError(null);
    try {
      const response = await fetch('/api/organizations'); // Panggil API Route GET
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch organizations.');
        console.error('Error fetching organizations:', data.error);
        setOrganizations([]); // Kosongkan daftar jika ada error
      } else {
        setOrganizations(data);
        console.log('Organizations fetched:', data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching organizations.');
      console.error('Fetch organizations error:', err);
       setOrganizations([]); // Kosongkan daftar jika ada error
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  // Handler submit form tambah Outlet
  const handleAddOutlet = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsAddingOutlet(true);
      setAddOutletError(null);

      // Temukan organisasi induk pengguna yang sedang login
      // Ini mengasumsikan pengguna yang login adalah 'owner' atau 'admin'
      // yang terhubung ke organisasi induk (parent_organization_id is NULL).
      // API /api/organizations GET sudah memfilter ini untuk peran tersebut.
      const ownerOrg = organizations.find(org => !org.parent_organization_id); // Cari organisasi induk (parent_organization_id is NULL)

      if (!ownerOrg) {
          setAddOutletError("Could not find the parent organization for the current user. Please ensure your user is associated with a parent organization.");
          setIsAddingOutlet(false);
          return;
      }


      try {
          const response = await fetch('/api/organizations', { // Panggil API Route POST
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  name: newOutletName,
                  parent_organization_id: ownerOrg.id // Kirim ID organisasi induk
              })
          });

          const data = await response.json();

          if (!response.ok) {
              setAddOutletError(data.error || 'Failed to add new outlet.');
              console.error('Error adding outlet:', data.error);
          } else {
              console.log('Outlet added successfully:', data);
              setNewOutletName(''); // Kosongkan input form
              setShowAddForm(false); // Sembunyikan form
              fetchOrganizations(); // Muat ulang daftar organisasi
          }

      } catch (err: any) {
          setAddOutletError(err.message || 'An error occurred while adding the outlet.');
          console.error('Add outlet fetch error:', err);
      } finally {
          setIsAddingOutlet(false);
      }
  };


  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication status...</div>; // Tampilkan loading state dari Auth Context
  }

  // Jika tidak login, useEffect akan mengarahkan ke /login
  if (!user) {
       return null; // Jangan render apa pun sebelum redirect
  }


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Organizations (Outlets)</h1>

      {error && <div className="text-red-500 mb-4">Error: {error}</div>}

      <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
          {showAddForm ? 'Cancel Add Outlet' : 'Add New Outlet'}
      </button>

      {/* Form Tambah Outlet Baru */}
      {showAddForm && (
          <div className="mb-6 p-4 border rounded shadow">
              <h3 className="text-xl font-semibold mb-3">Add New Outlet</h3>
              <form onSubmit={handleAddOutlet}>
                  <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newOutletName">
                          Outlet Name
                      </label>
                      <input
                          type="text"
                          id="newOutletName"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={newOutletName}
                          onChange={(e) => setNewOutletName(e.target.value)}
                          required
                      />
                  </div>
                  {addOutletError && <p className="text-red-500 text-xs italic mb-4">{addOutletError}</p>}
                  <button
                      type="submit"
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                      disabled={isAddingOutlet}
                  >
                      {isAddingOutlet ? 'Adding...' : 'Save Outlet'}
                  </button>
              </form>
          </div>
      )}

      {/* Daftar Organisasi */}
      <h3 className="text-xl font-semibold mb-3">Your Organizations</h3>
      {isLoadingOrganizations ? (
          <p>Loading organizations...</p>
      ) : (
          <ul>
              {organizations.length > 0 ? (
                  organizations.map(org => (
                      <li key={org.id} className="mb-2 p-3 border rounded">
                          <div className="font-bold">{org.name}</div>
                          <div className="text-sm text-gray-600">ID: {org.id}</div>
                           {org.parent_organization_id && (
                                <div className="text-sm text-gray-600">This is an Outlet (Parent ID: {org.parent_organization_id})</div>
                           )}
                           {!org.parent_organization_id && (
                                <div className="text-sm text-gray-600 italic">This is a Parent Organization</div>
                           )}
                          {/* TODO: Tambahkan tombol Edit/Delete Outlet jika peran pengguna mengizinkan */}
                      </li>
                  ))
              ) : (
                  <p>No organizations found.</p>
              )}
          </ul>
      )}

      {/* TODO: Tambahkan komponen atau link untuk manajemen pengguna */}
      {/* <h3 className="text-xl font-semibold mb-3 mt-6">Manage Users</h3>
      <Link href="/dashboard/users">
          <a className="text-blue-500 hover:underline">Go to User Management</a>
      </Link> */}

    </div>
  );
}