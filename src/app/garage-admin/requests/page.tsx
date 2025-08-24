'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '@/utils/common';
import type { ServiceRequest } from '@/types/auth';

export default function GarageAdminRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/requests?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setRequests(result.data.requests);
      } else {
        setError(result.error || 'Failed to fetch service requests');
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
      setError('Failed to fetch service requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);


  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return requests.length;
    return requests.filter(r => r.status === status).length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/garage-admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
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
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Status Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {['all', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
              <div
                key={status}
                className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-colors ${
                  statusFilter === status ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => setStatusFilter(status)}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{getStatusCount(status)}</div>
                  <div className="text-sm text-gray-600">
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Service Requests */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {statusFilter === 'all' ? 'All Service Requests' : `${statusFilter.replace('_', ' ')} Requests`} 
                  ({requests.filter(r => statusFilter === 'all' || r.status === statusFilter).length} found)
                </h3>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading requests...</p>
                </div>
              ) : requests.filter(r => statusFilter === 'all' || r.status === statusFilter).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="mt-2">No {statusFilter === 'all' ? '' : statusFilter.toLowerCase()} requests found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests
                    .filter(r => statusFilter === 'all' || r.status === statusFilter)
                    .map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Request #{request.id}
                            </h4>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Customer: {request.customer.firstName} {request.customer.lastName}</div>
                            <div>Vehicle: {request.vehicle.vehicleType} - {request.vehicle.plateCode} {request.vehicle.plateNumber}</div>
                            <div>Created: {formatDateTime(new Date(request.createdAt))}</div>
                            {request.mechanic && (
                              <div>Assigned to: {request.mechanic.firstName} {request.mechanic.lastName}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Request Details Modal */}
          {selectedRequest && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Service Request #{selectedRequest.id}
                    </h3>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      {getStatusBadge(selectedRequest.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700">Customer Information</h4>
                        <div>Name: {selectedRequest.customer.firstName} {selectedRequest.customer.lastName}</div>
                        <div>Email: {selectedRequest.customer.email}</div>
                        {selectedRequest.customer.phoneNumber && (
                          <div>Phone: {selectedRequest.customer.phoneNumber}</div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700">Vehicle Information</h4>
                        <div>Type: {selectedRequest.vehicle.vehicleType}</div>
                        <div>Plate: {selectedRequest.vehicle.plateCode} {selectedRequest.vehicle.plateNumber}</div>
                        <div>Color: {selectedRequest.vehicle.color}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700">Request Date:</span>
                      <span className="ml-2 text-sm">{formatDateTime(new Date(selectedRequest.createdAt))}</span>
                    </div>

                    {selectedRequest.mechanic && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Assigned Mechanic:</span>
                        <span className="ml-2 text-sm">
                          {selectedRequest.mechanic.firstName} {selectedRequest.mechanic.lastName}
                        </span>
                      </div>
                    )}

                    {/* Admin Status Update Actions */}
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Admin Actions</h4>
                      <div className="text-sm text-gray-600 mb-3">
                        As a garage admin, you can monitor and oversee all requests. Mechanics can accept and update their assigned requests directly.
                      </div>
                      
                      {['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(selectedRequest.status) && (
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-sm text-gray-600">
                            This request is currently being handled by the assigned mechanic or has been completed.
                          </div>
                        </div>
                      )}

                      {selectedRequest.status === 'PENDING' && (
                        <div className="bg-yellow-50 rounded p-3">
                          <div className="text-sm text-yellow-800">
                            This request is waiting for a mechanic to accept it. Your mechanics can accept it directly from their dashboard.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}