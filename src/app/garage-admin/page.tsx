'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '@/utils/common';
import type { ServiceRequest, VehicleStatus, Notification } from '@/types/auth';

export default function GarageAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'oversight' | 'notifications'>('overview');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleStatus[]>([]);
  const [oversightLoading, setOversightLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
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
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=15');
      const result = await response.json();

      if (result.success) {
        setNotifications(result.data.notifications);
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
    }
  }, []);

  const fetchVehicleStatuses = useCallback(async (serviceRequestId: number) => {
    try {
      setOversightLoading(true);
      const response = await fetch(`/api/vehicle-status?service_request_id=${serviceRequestId}`);
      const result = await response.json();

      if (result.success) {
        setVehicleStatuses(result.data.statuses);
      } else {
        setError(result.error || 'Failed to fetch service tracking');
      }
    } catch (error) {
      console.error('Fetch vehicle statuses error:', error);
      setError('Failed to fetch service tracking');
    } finally {
      setOversightLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchNotifications();
  }, [fetchRequests, fetchNotifications]);

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

  const activeRequests = requests.filter(r => ['ACCEPTED', 'IN_PROGRESS'].includes(r.status));
  const completedRequests = requests.filter(r => r.status === 'COMPLETED');
  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Garage Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            {notifications.filter(n => !n.read).length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setActiveTab('notifications')}
                  className="relative bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Notifications
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                </button>
              </div>
            )}
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {(['overview', 'oversight', 'notifications'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overview' && 'Overview & Management'}
                {tab === 'oversight' && 'Service Oversight'}
                {tab === 'notifications' && 'Notifications'}
                {tab === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 text-sm font-medium">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
                    </div>
                    <div className="text-yellow-500">⏳</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Active</p>
                      <p className="text-2xl font-bold text-gray-900">{activeRequests.length}</p>
                    </div>
                    <div className="text-blue-500">🔧</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{completedRequests.length}</p>
                    </div>
                    <div className="text-green-500">✅</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                    </div>
                    <div className="text-purple-500">📊</div>
                  </div>
                </div>
              </div>

              {/* Management Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                {/* Mechanic Applications */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Applications</dt>
                          <dd className="text-lg font-medium text-gray-900">Review</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/garage-admin/applications')}
                        className="font-medium text-purple-600 hover:text-purple-500"
                      >
                        Manage applications
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mechanic Performance */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Mechanics</dt>
                          <dd className="text-lg font-medium text-gray-900">Performance</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/garage-admin/mechanics')}
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Manage mechanics
                      </button>
                    </div>
                  </div>
                </div>

                {/* Garage Profile */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Garage Profile</dt>
                          <dd className="text-lg font-medium text-gray-900">Manage</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/garage-admin/profile')}
                        className="font-medium text-green-600 hover:text-green-500"
                      >
                        Edit garage details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Service Management */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Service Management</dt>
                          <dd className="text-lg font-medium text-gray-900">Manage</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/garage-admin/services')}
                        className="font-medium text-orange-600 hover:text-orange-500"
                      >
                        Manage services
                      </button>
                    </div>
                  </div>
                </div>

                {/* Service Requests */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Service Requests</dt>
                          <dd className="text-lg font-medium text-gray-900">Monitor</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/garage-admin/requests')}
                        className="font-medium text-blue-600 hover:text-blue-500"
                      >
                        View all requests
                      </button>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Analytics</dt>
                          <dd className="text-lg font-medium text-gray-900">Reports</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <button
                        onClick={() => router.push('/garage-admin/analytics')}
                        className="font-medium text-yellow-600 hover:text-yellow-500"
                      >
                        View garage analytics
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Service Oversight Tab */}
          {activeTab === 'oversight' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Service Oversight & Monitoring</h2>
              </div>

              {activeRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <div className="text-6xl mb-4">👁️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Services to Oversee</h3>
                  <p className="text-gray-600">Active service requests will appear here for detailed oversight.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white shadow rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Active Service Requests</h3>
                    <div className="space-y-4">
                      {activeRequests.map((request) => (
                        <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="flex items-center space-x-3">
                                <h4 className="text-lg font-semibold text-gray-900">Request #{request.id}</h4>
                                {getStatusBadge(request.status)}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                Customer: {request.customer.firstName} {request.customer.lastName} • 
                                Vehicle: {request.vehicle.vehicleType} - {request.vehicle.plateCode} {request.vehicle.plateNumber}
                                {request.mechanic && (
                                  <span> • Mechanic: {request.mechanic.firstName} {request.mechanic.lastName}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                fetchVehicleStatuses(request.id);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Service Oversight Modal */}
              {selectedRequest && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">
                          Service Oversight - Request #{selectedRequest.id}
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

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Request Information */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">Request Information</h4>
                          <div className="space-y-2 text-sm">
                            <div><strong>Status:</strong> {getStatusBadge(selectedRequest.status)}</div>
                            <div><strong>Customer:</strong> {selectedRequest.customer.firstName} {selectedRequest.customer.lastName}</div>
                            <div><strong>Vehicle:</strong> {selectedRequest.vehicle.vehicleType} - {selectedRequest.vehicle.plateCode} {selectedRequest.vehicle.plateNumber}</div>
                            <div><strong>Created:</strong> {formatDateTime(new Date(selectedRequest.createdAt))}</div>
                            {selectedRequest.mechanic && (
                              <div><strong>Assigned Mechanic:</strong> {selectedRequest.mechanic.firstName} {selectedRequest.mechanic.lastName}</div>
                            )}
                          </div>
                        </div>

                        {/* Service Progress Oversight */}
                        <div className="lg:col-span-2">
                          <h4 className="font-medium text-gray-900 mb-3">Service Progress & Activities</h4>
                          
                          {oversightLoading ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="mt-2 text-gray-600">Loading oversight data...</p>
                            </div>
                          ) : vehicleStatuses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <p>No service updates yet from the assigned mechanic.</p>
                            </div>
                          ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {vehicleStatuses.map((status) => (
                                <div key={status.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      status.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {status.approved ? '✅ Customer Approved' : '⏳ Pending Customer Approval'}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {formatDateTime(new Date(status.createdAt))}
                                    </span>
                                  </div>
                                  
                                  <p className="text-gray-900 mb-3">{status.description}</p>
                                  
                                  <div className="text-sm text-gray-600">
                                    <strong>By:</strong> {status.mechanic.firstName} {status.mechanic.lastName}
                                  </div>

                                  {/* Ongoing Services */}
                                  {status.ongoingServices.length > 0 && (
                                    <div className="mt-3">
                                      <h6 className="text-sm font-medium text-gray-700 mb-2">Ongoing Services:</h6>
                                      <div className="space-y-1">
                                        {status.ongoingServices.map((service) => (
                                          <div key={service.id} className="bg-blue-50 p-2 rounded text-sm">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium">{service.service.serviceName}</span>
                                              <span className={service.serviceFinished ? 'text-green-600' : 'text-blue-600'}>
                                                {service.serviceFinished ? '✅ Completed' : '🔄 In Progress'}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              Expected: {new Date(service.expectedDate).toLocaleDateString()} • ${service.totalPrice}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Additional Services */}
                                  {status.additionalServices.length > 0 && (
                                    <div className="mt-3">
                                      <h6 className="text-sm font-medium text-gray-700 mb-2">Additional Service Requests:</h6>
                                      <div className="space-y-1">
                                        {status.additionalServices.map((service) => (
                                          <div key={service.id} className="bg-orange-50 p-2 rounded text-sm">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium">{service.service.serviceName}</span>
                                              <span className={service.approved ? 'text-green-600' : 'text-yellow-600'}>
                                                {service.approved ? '✅ Customer Approved' : '⏳ Awaiting Approval'}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              Additional cost: ${service.totalPrice}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Notifications ({notifications.filter(n => !n.read).length} unread)
                </h2>
              </div>
              
              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <div className="text-4xl mb-4">🔔</div>
                  <p className="text-gray-600">No notifications yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border rounded-lg p-4 bg-white ${
                        !notification.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(new Date(notification.createdAt))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{notification.message}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        From: {notification.sender.firstName} {notification.sender.lastName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}