'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { formatDateTime } from '@/utils/common';
import type { ServiceRequest } from '@/types/auth';

function CustomerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [successMessage, setSuccessMessage] = useState(searchParams.get('success') || '');

  const fetchRequests = useCallback(async () => {
    if (activeTab !== 'requests') return;
    
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/requests');
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
  }, [activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCancelRequest = async (requestId: number) => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CANCELLED'
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchRequests();
        setSelectedRequest(null);
      } else {
        setError(result.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Cancel request error:', error);
      setError('Failed to cancel request');
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

  const canCancelRequest = (request: ServiceRequest) => {
    return ['PENDING', 'ACCEPTED'].includes(request.status);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push('/customer/profile')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Profile
            </button>
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
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'requests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Requests
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Welcome, Customer!</h2>
                  <p className="text-gray-600 mb-8 text-center">
                    Manage your profile, vehicles, and request automotive services from nearby garages.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <button
                      onClick={() => router.push('/customer/profile')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-lg font-medium text-center transition-colors"
                    >
                      <div className="text-xl mb-2">👤</div>
                      <div>Manage Profile</div>
                      <div className="text-sm opacity-75 mt-1">Update personal info & vehicles</div>
                    </button>
                    
                    <button
                      onClick={() => router.push('/customer/garages')}
                      className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg font-medium text-center transition-colors"
                    >
                      <div className="text-xl mb-2">🔍</div>
                      <div>Find Garages</div>
                      <div className="text-sm opacity-75 mt-1">Locate nearby services</div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg font-medium text-center transition-colors"
                    >
                      <div className="text-xl mb-2">📋</div>
                      <div>My Requests</div>
                      <div className="text-sm opacity-75 mt-1">Track service history</div>
                    </button>
                    
                    <button
                      onClick={() => router.push('/customer/garages')}
                      className="bg-orange-600 hover:bg-orange-700 text-white p-6 rounded-lg font-medium text-center transition-colors"
                    >
                      <div className="text-xl mb-2">🚗</div>
                      <div>Quick Request</div>
                      <div className="text-sm opacity-75 mt-1">Get help now</div>
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">New in Milestone 4: Service Requests! 🎉</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-blue-700 font-medium mb-2">✅ Now Available:</div>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>• Request service from any garage</li>
                          <li>• Track request status in real-time</li>
                          <li>• Communicate with assigned mechanics</li>
                          <li>• Cancel requests when needed</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm text-blue-700 font-medium mb-2">📱 How it works:</div>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>• Browse garages and their services</li>
                          <li>• Submit request with your location</li>
                          <li>• Mechanic accepts and provides updates</li>
                          <li>• Receive service and rate your experience</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Requests Tab */}
              {activeTab === 'requests' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">My Service Requests</h2>
                    <button
                      onClick={() => router.push('/customer/garages')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      New Request
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading requests...</p>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No service requests yet</h3>
                      <p className="mt-2 text-gray-600">Get started by finding a garage and requesting service.</p>
                      <button
                        onClick={() => router.push('/customer/garages')}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Find Garages
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Request #{request.id}
                                </h3>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>Garage: {request.garage.garageName}</div>
                                <div>Vehicle: {request.vehicle.vehicleType} - {request.vehicle.plateCode} {request.vehicle.plateNumber}</div>
                                <div>Requested: {formatDateTime(new Date(request.createdAt))}</div>
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
                              {canCancelRequest(request) && (
                                <button
                                  onClick={() => handleCancelRequest(request.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                        <h4 className="font-medium text-gray-700">Garage Information</h4>
                        <div>Name: {selectedRequest.garage.garageName}</div>
                        <div>Request Date: {formatDateTime(new Date(selectedRequest.createdAt))}</div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700">Vehicle Information</h4>
                        <div>Type: {selectedRequest.vehicle.vehicleType}</div>
                        <div>Plate: {selectedRequest.vehicle.plateCode} {selectedRequest.vehicle.plateNumber}</div>
                        <div>Color: {selectedRequest.vehicle.color}</div>
                      </div>
                    </div>

                    {selectedRequest.mechanic && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-700 mb-1">Assigned Mechanic</h4>
                        <div className="text-sm text-blue-600">
                          {selectedRequest.mechanic.firstName} {selectedRequest.mechanic.lastName}
                          {selectedRequest.mechanic.phoneNumber && (
                            <div>Phone: {selectedRequest.mechanic.phoneNumber}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {canCancelRequest(selectedRequest) && (
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleCancelRequest(selectedRequest.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
                        >
                          Cancel Request
                        </button>
                      </div>
                    )}
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

export default function CustomerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CustomerDashboardContent />
    </Suspense>
  );
}