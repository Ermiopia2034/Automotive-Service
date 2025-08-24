'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { formatDateTime } from '@/utils/common';
import type { ServiceRequest, VehicleStatus, Notification } from '@/types/auth';
import PaymentHistory from '@/components/PaymentHistory';
import PaymentForm from '@/components/PaymentForm';
import InvoiceDisplay from '@/components/InvoiceDisplay';

function CustomerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper function to validate tab values
  const getValidTab = (tab: string | null): 'overview' | 'requests' | 'tracking' | 'payments' | 'feedback' | 'notifications' => {
    const validTabs: readonly string[] = ['overview', 'requests', 'tracking', 'payments', 'feedback', 'notifications'];
    return validTabs.includes(tab || '') ? (tab as 'overview' | 'requests' | 'tracking' | 'payments' | 'feedback' | 'notifications') : 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'tracking' | 'payments' | 'feedback' | 'notifications'>(getValidTab(searchParams.get('tab')));
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [successMessage, setSuccessMessage] = useState(searchParams.get('success') || '');

  // Service tracking states
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleStatus[]>([]);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<number | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Payment states
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<ServiceRequest | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [showInvoiceDisplay, setShowInvoiceDisplay] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (activeTab !== 'requests' && activeTab !== 'tracking') return;
    
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

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
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
      setTrackingLoading(true);
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
      setTrackingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchNotifications();
  }, [fetchRequests, fetchNotifications]);

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

  const handleApproveStatusUpdate = async (statusId: number, approved: boolean) => {
    try {
      setError('');

      const response = await fetch(`/api/vehicle-status/${statusId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      });

      const result = await response.json();

      if (result.success && selectedServiceRequest) {
        await fetchVehicleStatuses(selectedServiceRequest);
      } else {
        setError(result.error || 'Failed to update status approval');
      }
    } catch (error) {
      console.error('Approve status error:', error);
      setError('Failed to update status approval');
    }
  };

  const handleApproveAdditionalService = async (serviceId: number, approved: boolean) => {
    try {
      setError('');

      const response = await fetch(`/api/additional-services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      });

      const result = await response.json();

      if (result.success && selectedServiceRequest) {
        await fetchVehicleStatuses(selectedServiceRequest);
      } else {
        setError(result.error || 'Failed to update additional service');
      }
    } catch (error) {
      console.error('Approve additional service error:', error);
      setError('Failed to update additional service');
    }
  };

  const markNotificationsAsRead = async (notificationIds: number[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Mark notifications as read error:', error);
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

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedPaymentRequest(null);
    // Optionally refresh payment history
  };

  const handleViewInvoice = (invoiceId: number) => {
    setSelectedInvoiceId(invoiceId);
    setShowInvoiceDisplay(true);
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

  const activeRequests = requests.filter(r => ['ACCEPTED', 'IN_PROGRESS'].includes(r.status));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
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
                {(['overview', 'requests', 'tracking', 'payments', 'feedback', 'notifications'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab === 'overview' && 'Overview'}
                    {tab === 'requests' && 'My Requests'}
                    {tab === 'tracking' && 'Service Tracking'}
                    {tab === 'payments' && 'Payments & Invoices'}
                    {tab === 'feedback' && 'My Reviews'}
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

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Welcome, Customer!</h2>
                  <p className="text-gray-600 mb-8 text-center">
                    Manage your profile, vehicles, and request automotive services with detailed progress tracking.
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
                      onClick={() => router.push('/customer/feedback')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white p-6 rounded-lg font-medium text-center transition-colors"
                    >
                      <div className="text-xl mb-2">⭐</div>
                      <div>My Reviews</div>
                      <div className="text-sm opacity-75 mt-1">View and manage ratings</div>
                    </button>

                    <button
                      onClick={() => setActiveTab('tracking')}
                      className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg font-medium text-center transition-colors"
                    >
                      <div className="text-xl mb-2">📊</div>
                      <div>Track Progress</div>
                      <div className="text-sm opacity-75 mt-1">Real-time service updates</div>
                    </button>

                    <button
                      onClick={() => setActiveTab('requests')}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg font-medium text-center transition-colors"
                    >
                      <div className="text-xl mb-2">📋</div>
                      <div>My Requests</div>
                      <div className="text-sm opacity-75 mt-1">Service request history</div>
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Milestone 5: Advanced Service Tracking! 🚀</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-blue-700 font-medium mb-2">✅ New Features:</div>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>• Real-time progress tracking with detailed updates</li>
                          <li>• Approve/decline mechanic status updates</li>
                          <li>• Review additional service requests</li>
                          <li>• Track ongoing services with completion status</li>
                          <li>• Receive instant notifications</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm text-blue-700 font-medium mb-2">🔧 Enhanced Workflow:</div>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>• Mechanics provide detailed status updates</li>
                          <li>• You approve work performed</li>
                          <li>• Additional services require your approval</li>
                          <li>• Complete transparency throughout service</li>
                          <li>• Final pricing and completion confirmation</li>
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
                                {['ACCEPTED', 'IN_PROGRESS'].includes(request.status) && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Track Progress Available
                                  </span>
                                )}
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
                              {['ACCEPTED', 'IN_PROGRESS'].includes(request.status) && (
                                <button
                                  onClick={() => {
                                    setActiveTab('tracking');
                                    setSelectedServiceRequest(request.id);
                                  }}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                                >
                                  Track
                                </button>
                              )}
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

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Payments & Invoices</h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment History */}
                    <div className="bg-white shadow rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                      <PaymentHistory onViewInvoice={handleViewInvoice} />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white shadow rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setActiveTab('requests')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                          View Service Requests
                        </button>
                        <button
                          onClick={() => router.push('/customer/garages')}
                          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                          Request New Service
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Tracking Tab */}
              {activeTab === 'tracking' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Real-time Service Tracking</h2>
                  </div>

                  {activeRequests.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-6xl mb-4">🔧</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Services</h3>
                      <p className="text-gray-600 mb-4">You do not have any services currently being worked on.</p>
                      <button
                        onClick={() => router.push('/customer/garages')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Request Service
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white shadow rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Service Request to Track:
                        </label>
                        <select
                          value={selectedServiceRequest || ''}
                          onChange={(e) => {
                            const requestId = parseInt(e.target.value);
                            setSelectedServiceRequest(requestId);
                            if (requestId) {
                              fetchVehicleStatuses(requestId);
                            }
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a request...</option>
                          {activeRequests.map((request) => (
                            <option key={request.id} value={request.id}>
                              Request #{request.id} - {request.garage.garageName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedServiceRequest && (
                        <div className="bg-white shadow rounded-lg p-6">
                          {trackingLoading ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="mt-2 text-gray-600">Loading service tracking...</p>
                            </div>
                          ) : vehicleStatuses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <p>No status updates available yet.</p>
                              <p className="text-sm mt-1">The mechanic will provide updates soon.</p>
                            </div>
                          ) : (
                            <ServiceTrackingTimeline
                              statuses={vehicleStatuses}
                              onApproveStatus={handleApproveStatusUpdate}
                              onApproveAdditionalService={handleApproveAdditionalService}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">My Reviews & Ratings</h2>
                    <button
                      onClick={() => router.push('/customer/feedback')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      View All Reviews
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="text-2xl">⭐</div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900">Share Your Experience</h3>
                        <p className="text-blue-700">Your reviews help other customers make informed decisions</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">How to Rate Services</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Rate after service completion</li>
                          <li>• Be honest and constructive</li>
                          <li>• Mention specific mechanics if applicable</li>
                          <li>• Include details in your comments</li>
                        </ul>
                      </div>

                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Rating Scale</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">10 - Excellent</span>
                            <span className="text-green-600">⭐⭐⭐⭐⭐</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">7-9 - Good</span>
                            <span className="text-blue-600">⭐⭐⭐⭐</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">4-6 - Fair</span>
                            <span className="text-yellow-600">⭐⭐⭐</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">1-3 - Poor</span>
                            <span className="text-red-600">⭐⭐</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <button
                        onClick={() => router.push('/customer/garages')}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md text-sm font-medium"
                      >
                        Find Garages to Review
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Logout
                    </button>
                  </div>

                  {activeRequests.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-6xl mb-4">🔧</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Services</h3>
                      <p className="text-gray-600 mb-4">You don&apos;t have any services currently being worked on.</p>
                      <button
                        onClick={() => router.push('/customer/garages')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Request Service
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white shadow rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Service Request to Track:
                        </label>
                        <select
                          value={selectedServiceRequest || ''}
                          onChange={(e) => {
                            const requestId = parseInt(e.target.value);
                            setSelectedServiceRequest(requestId);
                            if (requestId) {
                              fetchVehicleStatuses(requestId);
                            }
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Choose a request to track</option>
                          {activeRequests.map((request) => (
                            <option key={request.id} value={request.id}>
                              Request #{request.id} - {request.garage.garageName} ({request.vehicle.vehicleType})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedServiceRequest && (
                        <div className="bg-white shadow rounded-lg">
                          <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                              Service Progress & Updates
                            </h3>
                            
                            {trackingLoading ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading progress...</p>
                              </div>
                            ) : vehicleStatuses.length === 0 ? (
                              <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-3">⏳</div>
                                <p>No updates from your mechanic yet.</p>
                                <p className="text-sm">You&apos;ll see detailed progress updates here once work begins.</p>
                              </div>
                            ) : (
                              <ServiceTrackingTimeline
                                statuses={vehicleStatuses}
                                onApproveStatus={handleApproveStatusUpdate}
                                onApproveAdditionalService={handleApproveAdditionalService}
                              />
                            )}
                          </div>
                        </div>
                      )}
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
                    {notifications.filter(n => !n.read).length > 0 && (
                      <button
                        onClick={() => markNotificationsAsRead(notifications.filter(n => !n.read).map(n => n.id))}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-4xl mb-4">🔔</div>
                      <p className="text-gray-600">No notifications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`border rounded-lg p-4 ${
                            notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
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
                          {!notification.read && (
                            <button
                              onClick={() => markNotificationsAsRead([notification.id])}
                              className="text-xs text-blue-600 hover:text-blue-500 mt-2"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Payment Form Modal */}
          {showPaymentForm && selectedPaymentRequest && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Make Payment - Request #{selectedPaymentRequest.id}
                    </h3>
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <PaymentForm
                    serviceRequestId={selectedPaymentRequest.id}
                    amount={0} // This should be calculated based on the service request
                    description={`Payment for Service Request #${selectedPaymentRequest.id}`}
                    onSubmitSuccess={handlePaymentSuccess}
                    onCancel={() => setShowPaymentForm(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Invoice Display Modal */}
          {showInvoiceDisplay && selectedInvoiceId && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Invoice Details
                    </h3>
                    <button
                      onClick={() => setShowInvoiceDisplay(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <InvoiceDisplay
                    invoiceId={selectedInvoiceId}
                    onClose={() => setShowInvoiceDisplay(false)}
                  />
                </div>
              </div>
            </div>
          )}

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

                    {['ACCEPTED', 'IN_PROGRESS'].includes(selectedRequest.status) && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-700 font-medium">Track detailed progress</span>
                          <button
                            onClick={() => {
                              setActiveTab('tracking');
                              setSelectedServiceRequest(selectedRequest.id);
                              setSelectedRequest(null);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                          >
                            View Progress
                          </button>
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

// Service Tracking Timeline Component
function ServiceTrackingTimeline({ 
  statuses, 
  onApproveStatus, 
  onApproveAdditionalService 
}: {
  statuses: VehicleStatus[];
  onApproveStatus: (statusId: number, approved: boolean) => void;
  onApproveAdditionalService: (serviceId: number, approved: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {statuses.map((status, index) => (
        <div key={status.id} className="relative">
          {/* Timeline line */}
          {index < statuses.length - 1 && (
            <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-300"></div>
          )}
          
          <div className="flex items-start space-x-4">
            {/* Timeline icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              status.approved ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {status.approved ? (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      status.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {status.approved ? 'Approved' : 'Pending Your Approval'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(new Date(status.createdAt))}
                    </span>
                  </div>
                </div>

                <p className="text-gray-900 mb-3">{status.description}</p>
                
                {/* Approval buttons */}
                {!status.approved && (
                  <div className="flex space-x-2 mb-4">
                    <button
                      onClick={() => onApproveStatus(status.id, true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ✓ Approve Update
                    </button>
                    <button
                      onClick={() => onApproveStatus(status.id, false)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      ✗ Decline
                    </button>
                  </div>
                )}

                {/* Ongoing Services */}
                {status.ongoingServices.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Services Being Performed:</h5>
                    <div className="space-y-2">
                      {status.ongoingServices.map((service) => (
                        <div key={service.id} className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-blue-900">{service.service.serviceName}</div>
                              <div className="text-sm text-blue-700">
                                Expected: {new Date(service.expectedDate).toLocaleDateString()} • ${service.totalPrice}
                              </div>
                            </div>
                            <div className="text-right">
                              {service.serviceFinished ? (
                                <span className="text-green-600 font-medium text-sm">✓ Completed</span>
                              ) : (
                                <span className="text-blue-600 font-medium text-sm">🔄 In Progress</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Services */}
                {status.additionalServices.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Additional Service Requests:</h5>
                    <div className="space-y-2">
                      {status.additionalServices.map((service) => (
                        <div key={service.id} className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-orange-900">{service.service.serviceName}</div>
                              <div className="text-sm text-orange-700">
                                Additional cost: ${service.totalPrice}
                              </div>
                            </div>
                          </div>
                          
                          {!service.approved && (
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={() => onApproveAdditionalService(service.id, true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                              >
                                ✓ Approve (${service.totalPrice})
                              </button>
                              <button
                                onClick={() => onApproveAdditionalService(service.id, false)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                              >
                                ✗ Decline
                              </button>
                            </div>
                          )}

                          {service.approved && (
                            <div className="mt-2">
                              <span className="text-green-600 font-medium text-sm">✓ Approved by you</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
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