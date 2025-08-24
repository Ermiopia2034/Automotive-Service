'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/utils/common';

interface Garage {
  id: number;
  garageName: string;
  latitude: number;
  longitude: number;
  rating: number;
  available: boolean;
  removed: boolean;
  approved: boolean;
  createdAt: string;
  admin: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phoneNumber: string | null;
  };
  _count: {
    mechanics: number;
    services: number;
    serviceRequests: number;
    ratings: number;
  };
}


export default function GarageManagementPage() {
  const router = useRouter();
  const [garages, setGarages] = useState<Garage[]>([]);
  const [stats, setStats] = useState({
    totalGarages: 0,
    approvedGarages: 0,
    pendingGarages: 0,
    removedGarages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection states
  const [selectedGarages, setSelectedGarages] = useState<number[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ action: string; garageIds: number[] } | null>(null);

  const fetchGarages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/admin/garages?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setGarages(result.data.garages);
        setStats(result.data.stats);
      } else {
        setError(result.error || 'Failed to fetch garages');
      }
    } catch (error) {
      console.error('Fetch garages error:', error);
      setError('Failed to fetch garages');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, currentPage]);

  useEffect(() => {
    fetchGarages();
  }, [fetchGarages]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGarageSelection = (garageId: number, checked: boolean) => {
    if (checked) {
      setSelectedGarages([...selectedGarages, garageId]);
    } else {
      setSelectedGarages(selectedGarages.filter(id => id !== garageId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGarages(garages.map(garage => garage.id));
    } else {
      setSelectedGarages([]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedGarages.length === 0) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/garages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          garageIds: selectedGarages,
          action
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setSelectedGarages([]);
        setConfirmAction(null);
        await fetchGarages();
      } else {
        setError(result.error || 'Failed to perform bulk action');
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      setError('Failed to perform bulk action');
    }
  };

  const handleDeleteGarages = async () => {
    if (!confirmAction || selectedGarages.length === 0) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/garages', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          garageIds: selectedGarages,
          confirm: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setSelectedGarages([]);
        setConfirmAction(null);
        await fetchGarages();
      } else {
        setError(result.error || 'Failed to delete garages');
      }
    } catch (error) {
      console.error('Delete garages error:', error);
      setError('Failed to delete garages');
    }
  };

  const getStatusBadge = (garage: Garage) => {
    if (garage.removed) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Removed</span>;
    } else if (garage.approved) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const getAvailabilityBadge = (available: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        available ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {available ? 'Available' : 'Unavailable'}
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
            <h1 className="text-3xl font-bold text-gray-900">Garage Management</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
              <div className="text-center">
                <p className="text-blue-600 text-sm font-medium">Total Garages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGarages}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
              <div className="text-center">
                <p className="text-green-600 text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approvedGarages}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
              <div className="text-center">
                <p className="text-yellow-600 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingGarages}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-400">
              <div className="text-center">
                <p className="text-red-600 text-sm font-medium">Removed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.removedGarages}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending Approval</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Garages
                </label>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, admin name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('all');
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
          {selectedGarages.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    {selectedGarages.length} garage(s) selected
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleBulkAction('remove')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => handleBulkAction('restore')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleBulkAction('toggleAvailability')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Toggle Availability
                  </button>
                  <button
                    onClick={() => setConfirmAction({ action: 'delete', garageIds: selectedGarages })}
                    className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete Permanently
                  </button>
                  <button
                    onClick={() => setSelectedGarages([])}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmAction && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.888-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mt-2">Confirm Permanent Deletion</h3>
                  <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to permanently delete {selectedGarages.length} garage(s)? 
                      This action cannot be undone and will remove all associated data including mechanics, 
                      service requests, and ratings.
                    </p>
                  </div>
                  <div className="flex justify-center space-x-4 mt-4">
                    <button
                      onClick={handleDeleteGarages}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Yes, Delete Permanently
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Garages Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Garages ({garages.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading garages...</p>
              </div>
            ) : garages.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No garages found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedGarages.length === garages.length && garages.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Garage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {garages.map((garage) => (
                      <tr key={garage.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedGarages.includes(garage.id)}
                            onChange={(e) => handleGarageSelection(garage.id, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {garage.garageName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {garage.latitude.toFixed(6)}, {garage.longitude.toFixed(6)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {garage.admin.firstName} {garage.admin.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{garage.admin.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {garage.admin.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getStatusBadge(garage)}
                            {getAvailabilityBadge(garage.available)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              {garage.rating.toFixed(1)}
                            </span>
                            <span className="text-yellow-400 ml-1">★</span>
                            <span className="text-sm text-gray-500 ml-1">
                              ({garage._count.ratings})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>Mechanics: {garage._count.mechanics}</div>
                            <div>Services: {garage._count.services}</div>
                            <div>Requests: {garage._count.serviceRequests}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(new Date(garage.createdAt))}
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