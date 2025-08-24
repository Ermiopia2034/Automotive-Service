'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ApiResponse, Application } from '@/types/auth';

export default function SystemAdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'GARAGE' | 'MECHANIC'>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/applications?';
      
      if (filter !== 'all') {
        url += `status=${filter}&`;
      }
      
      if (typeFilter !== 'all') {
        url += `type=${typeFilter}&`;
      }

      const response = await fetch(url);
      const data: ApiResponse<{ applications: Application[] }> = await response.json();

      if (response.ok && data.success) {
        setApplications(data.data!.applications);
      } else {
        setError(data.error || 'Failed to load applications');
      }
    } catch (error) {
      console.error('Fetch applications error:', error);
      setError('Network error while loading applications');
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApproval = async (applicationId: number, approved: boolean) => {
    setProcessingId(applicationId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Application ${approved ? 'approved' : 'rejected'} successfully`);
        await fetchApplications(); // Refresh the list
      } else {
        setError(data.error || 'Failed to process application');
      }
    } catch (error) {
      console.error('Application approval error:', error);
      setError('Network error while processing application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusBadge = (application: Application) => {
    if (application.approved === null) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
    } else if (application.approved) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Approved</span>;
    } else {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Rejected</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    const bgColor = type === 'GARAGE' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
    return <span className={`px-2 py-1 text-xs ${bgColor} rounded-full`}>{type}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Management</h1>
            <p className="text-sm text-gray-600 mt-1">Review and approve business applications</p>
          </div>
          <div className="flex space-x-2">
            <Link
              href="/system-admin"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
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

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Applications</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'GARAGE' | 'MECHANIC')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="GARAGE">Garage Applications</option>
                <option value="MECHANIC">Mechanic Applications</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Applications ({applications.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No applications found matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {applications.map((application) => (
                <div key={application.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getTypeBadge(application.applicationType)}
                        {getStatusBadge(application)}
                      </div>
                      
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {application.applicationType === 'GARAGE' 
                          ? `Garage: ${application.garage?.garageName || 'Unknown'}` 
                          : `Mechanic Application for ${application.garage?.garageName || 'Unknown Garage'}`
                        }
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <strong>Applicant:</strong> {application.applicant.firstName} {application.applicant.lastName}
                        </div>
                        <div>
                          <strong>Username:</strong> {application.applicant.username}
                        </div>
                        <div>
                          <strong>Email:</strong> {application.applicant.email}
                        </div>
                        <div>
                          <strong>Applied:</strong> {new Date(application.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {application.approved === null && (
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => handleApproval(application.id, true)}
                          disabled={processingId === application.id}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            processingId === application.id
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {processingId === application.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleApproval(application.id, false)}
                          disabled={processingId === application.id}
                          className={`px-4 py-2 text-sm font-medium rounded-md ${
                            processingId === application.id
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {processingId === application.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}