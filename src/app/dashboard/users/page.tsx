// src/app/dashboard/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useRouter } from 'next/navigation';

// Definisikan tipe untuk Profil Pengguna
interface UserProfile {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    organization_id: string | null;
}

// Definisikan tipe untuk Organisasi
interface Organization {
    id: string;
    name: string;
}

export default function UsersPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State untuk form tambah/edit pengguna
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        password: '', // Hanya untuk pengguna baru
        role: 'cashier',
        organization_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Efek untuk memuat data awal
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        if (user) {
            fetchData();
        }
    }, [user, loading, router]);

    const fetchData = async () => {
        setIsLoadingData(true);
        setError(null);
        try {
            const [usersResponse, orgsResponse] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/organizations')
            ]);

            if (!usersResponse.ok) {
                const usersData = await usersResponse.json();
                throw new Error(usersData.error || 'Failed to fetch users.');
            }
             if (!orgsResponse.ok) {
                const orgsData = await orgsResponse.json();
                throw new Error(orgsData.error || 'Failed to fetch organizations.');
            }

            const usersData = await usersResponse.json();
            const orgsData = await orgsResponse.json();
            
            setUsers(usersData);
            setOrganizations(orgsData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: value }));
    };
    
    const openAddForm = () => {
        setIsEditing(false);
        setCurrentUser(null);
        setFormState({ name: '', email: '', password: '', role: 'cashier', organization_id: organizations[0]?.id || '' });
        setShowForm(true);
        setFormError(null);
    };

    const openEditForm = (userProfile: UserProfile) => {
        setIsEditing(true);
        setCurrentUser(userProfile);
        setFormState({
            name: userProfile.name || '',
            email: userProfile.email || '',
            password: '',
            role: userProfile.role || 'cashier',
            organization_id: userProfile.organization_id || ''
        });
        setShowForm(true);
        setFormError(null);
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError(null);

        const url = isEditing ? `/api/users/${currentUser?.id}` : '/api/users';
        const method = isEditing ? 'PUT' : 'POST';
        
        const body = isEditing 
            ? { name: formState.name, role: formState.role, organization_id: formState.organization_id }
            : formState;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Submission failed.');
            
            setShowForm(false);
            fetchData();
            
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete user.');

            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };


    if (loading || isLoadingData) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Manage Users</h1>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

            {!showForm && (
                 <button
                    onClick={openAddForm}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
                >
                    Add New User
                </button>
            )}

            {showForm && (
                <div className="mb-6 p-4 border rounded shadow bg-gray-50">
                    <h3 className="text-xl font-semibold mb-3">{isEditing ? 'Edit User' : 'Add New User'}</h3>
                    <form onSubmit={handleFormSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Full Name</label>
                            <input type="text" id="name" name="name" value={formState.name} onChange={handleFormChange} className="shadow appearance-none border rounded w-full py-2 px-3" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                            <input type="email" id="email" name="email" value={formState.email} onChange={handleFormChange} className="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-200" required disabled={isEditing} />
                        </div>
                        {!isEditing && (
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                                <input type="password" id="password" name="password" value={formState.password} onChange={handleFormChange} className="shadow appearance-none border rounded w-full py-2 px-3" placeholder="Leave blank to send invite" />
                                <p className="text-xs text-gray-600 mt-1">If password is blank, an invitation link will be sent.</p>
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">Role</label>
                            <select id="role" name="role" value={formState.role} onChange={handleFormChange} className="shadow border rounded w-full py-2 px-3">
                                <option value="cashier">Cashier</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div className="mb-4">
                             <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="organization_id">Organization/Outlet</label>
                            <select id="organization_id" name="organization_id" value={formState.organization_id} onChange={handleFormChange} className="shadow border rounded w-full py-2 px-3" required>
                                {organizations.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>

                        {formError && <p className="text-red-500 text-xs italic mb-4">{formError}</p>}
                        <div className="flex items-center gap-4">
                            <button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                                {isSubmitting ? 'Saving...' : 'Save User'}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}


            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full">
                    <thead className="bg-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map(userProfile => (
                            <tr key={userProfile.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{userProfile.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{userProfile.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button onClick={() => openEditForm(userProfile)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                    <button onClick={() => handleDeleteUser(userProfile.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
