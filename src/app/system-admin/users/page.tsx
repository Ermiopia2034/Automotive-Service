'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/utils/common';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  userType: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    garagesOwned: number;
    vehicles: number;
    customerRequests: number;
  };
  mechanic: {
    id: number;
  } | null;
}


export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    customers: 0,
    mechanics: 0,
    garageAdmins: 0,
    systemAdmins: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter states
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (userTypeFilter !== 'all') params.append('userType', userTypeFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setUsers(result.data.users);
        setStats(result.data.stats);
      } else {
        setError(result.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [userTypeFilter, searchTerm, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUserSelection = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkAction = async (action: string, newUserType?: string) => {
    if (selectedUsers.length === 0) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          action,
          newUserType
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setSelectedUsers([]);
        await fetchUsers();
      } else {
        setError(result.error || 'Failed to perform bulk action');
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      setError('Failed to perform bulk action');
    }
  };

  const getUserTypeBadge = (userType: string) => {
    const colors = {
      CUSTOMER: 'bg-blue-100 text-blue-800',
      MECHANIC: 'bg-green-100 text-green-800',
      GARAGE_ADMIN: 'bg-purple-100 text-purple-800',
      SYSTEM_ADMIN: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[userType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {userType.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/system-admin"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push('/auth/change-password')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
              <div className="text-center">
                <p className="text-blue-600 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
              <div className="text-center">
                <p className="text-green-600 text-sm font-medium">Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.customers}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
              <div className="text-center">
                <p className="text-yellow-600 text-sm font-medium">Mechanics</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mechanics}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
              <div className="text-center">
                <p className="text-purple-600 text-sm font-medium">Garage Admins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.garageAdmins}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-400">
              <div className="text-center">
                <p className="text-red-600 text-sm font-medium">System Admins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.systemAdmins}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="userType-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  User Type
                </label>
                <select
                  id="userType-filter"
                  value={userTypeFilter}
                  onChange={(e) => {
                    setUserTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All User Types</option>
                  <option value="CUSTOMER">Customers</option>
                  <option value="MECHANIC">Mechanics</option>
                  <option value="GARAGE_ADMIN">Garage Admins</option>
                  <option value="SYSTEM_ADMIN">System Admins</option>
                </select>
              </div>
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, username, or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setUserTypeFilter('all');
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    {selectedUsers.length} user(s) selected
                  </p>
                </div>
                <div className="flex space-x-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction('changeUserType', e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-3 py-1 border border-blue-300 rounded text-sm"
                  >
                    <option value="">Change User Type...</option>
                    <option value="CUSTOMER">To Customer</option>
                    <option value="MECHANIC">To Mechanic</option>
                    <option value="GARAGE_ADMIN">To Garage Admin</option>
                  </select>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Users ({users.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No users found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{user.username}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getUserTypeBadge(user.userType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phoneNumber || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {user._count.garagesOwned > 0 && (
                              <div>Garages: {user._count.garagesOwned}</div>
                            )}
                            {user._count.vehicles > 0 && (
                              <div>Vehicles: {user._count.vehicles}</div>
                            )}
                            {user._count.customerRequests > 0 && (
                              <div>Requests: {user._count.customerRequests}</div>
                            )}
                            {user.mechanic && (
                              <div>Mechanic ID: {user.mechanic.id}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(new Date(user.createdAt))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}