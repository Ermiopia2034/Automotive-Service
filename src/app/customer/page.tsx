'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { formatDateTime } from '@/utils/common';
import type { ServiceRequest, VehicleStatus, Notification } from '@/types/auth';
import PaymentHistory from '@/components/PaymentHistory';
import PaymentForm from '@/components/PaymentForm';
import InvoiceDisplay from '@/components/InvoiceDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';

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
        })
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
        body: JSON.stringify({ approved })
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
        body: JSON.stringify({ approved })
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
        body: JSON.stringify({ notificationIds })
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
    fetchRequests();
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
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                Customer Dashboard
              </h1>
              {notifications.filter(n => !n.read).length > 0 && (
                <p className="text-sm text-gray-600 mt-1 sm:hidden">
                  {notifications.filter(n => !n.read).length} unread notification{notifications.filter(n => !n.read).length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <div className="sm:hidden">
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-label={`View notifications (${notifications.filter(n => !n.read).length} unread)`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5h-5l5-5zm-3-4V7a4 4 0 00-8 0v6H2l4 4h8l4-4h-2z" />
                </svg>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:justify-end sm:space-x-3 mt-4 sm:mt-0 sm:absolute sm:top-4 sm:right-4 lg:right-8">
            {notifications.filter(n => !n.read).length > 0 && (
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white px-3 py-2 lg:px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`View notifications (${notifications.filter(n => !n.read).length} unread)`}
              >
                <span className="hidden lg:inline">Notifications</span>
                <span className="lg:hidden">Notif.</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                  {notifications.filter(n => !n.read).length}
                </span>
              </button>
            )}
            <button
              onClick={() => router.push('/customer/profile')}
              className="bg-green-600 hover:bg-green-700 focus:bg-green-700 text-white px-3 py-2 lg:px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <span className="hidden lg:inline">Profile</span>
              <span className="lg:hidden">👤</span>
            </button>
            <button
              onClick={() => router.push('/auth/change-password')}
              className="bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white px-3 py-2 lg:px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="hidden lg:inline">Change Password</span>
              <span className="lg:hidden">🔐</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 focus:bg-red-700 text-white px-3 py-2 lg:px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <span className="hidden lg:inline">Logout</span>
              <span className="lg:hidden">🚪</span>
            </button>
          </div>

          <div className="flex sm:hidden space-x-2 mt-4">
            <button
              onClick={() => router.push('/customer/profile')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              👤 Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8" role="main">
        {successMessage && (
          <div className="mb-4 sm:mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg" role="alert" aria-live="polite">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{successMessage}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert" aria-live="assertive">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="sm:hidden px-4 py-3">
              <label htmlFor="tab-select" className="sr-only">Select a tab</label>
              <select
                id="tab-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="overview">📊 Overview</option>
                <option value="requests">📝 Service Requests</option>
                <option value="tracking">🚗 Service Tracking</option>
                <option value="payments">💳 Payments</option>
                <option value="feedback">⭐ Feedback</option>
                <option value="notifications">🔔 Notifications</option>
              </select>
            </div>

            <nav className="hidden sm:flex sm:space-x-6 lg:space-x-8 px-4 sm:px-6 overflow-x-auto" aria-label="Dashboard sections">
              {(['overview', 'requests', 'tracking', 'payments', 'feedback', 'notifications'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-current={activeTab === tab ? 'page' : undefined}
                >
                  {tab === 'overview' && '📊 Overview'}
                  {tab === 'requests' && '📝 Service Requests'}
                  {tab === 'tracking' && '🚗 Service Tracking'}
                  {tab === 'payments' && '💳 Payments'}
                  {tab === 'feedback' && '⭐ Feedback'}
                  {tab === 'notifications' && '🔔 Notifications'}
                  {tab === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] h-5 flex items-center justify-center" aria-label={`${notifications.filter(n => !n.read).length} unread notifications`}>
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'overview' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="text-2xl text-blue-600 mr-3">📝</div>
                        <div>
                          <p className="text-sm font-medium text-blue-700">Total Requests</p>
                          <p className="text-2xl font-bold text-blue-900">{requests.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="text-2xl text-green-600 mr-3">✅</div>
                        <div>
                          <p className="text-sm font-medium text-green-700">Active Services</p>
                          <p className="text-2xl font-bold text-green-900">{activeRequests.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="text-2xl text-purple-600 mr-3">🔔</div>
                        <div>
                          <p className="text-sm font-medium text-purple-700">Unread Notifications</p>
                          <p className="text-2xl font-bold text-purple-900">{notifications.filter(n => !n.read).length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => router.push('/customer/garages')}
                        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">🔍</span>
                          <span className="font-medium text-gray-900">Find Garages</span>
                        </div>
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">📝</span>
                          <span className="font-medium text-gray-900">View Service Requests</span>
                        </div>
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                    {requests.slice(0, 3).length === 0 ? (
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    ) : (
                      <div className="space-y-3">
                        {requests.slice(0, 3).map((request) => (
                          <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">
                                Request #{request.id}
                              </span>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateTime(new Date(request.createdAt))}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Service Requests</h2>
                  <button
                    onClick={() => router.push('/customer/garages')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    New Request
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner size="lg" />
                    <p className="text-gray-500 mt-2">Loading service requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-gray-600 mb-4">No service requests yet.</p>
                    <button
                      onClick={() => router.push('/customer/garages')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Find a Garage
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-medium text-gray-900">Request #{request.id}</h3>
                            {getStatusBadge(request.status)}
                            {['ACCEPTED', 'IN_PROGRESS'].includes(request.status) && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Tracking Available
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <div>Garage: {request.garage.garageName}</div>
                            <div>Requested: {formatDateTime(new Date(request.createdAt))}</div>
                            {request.mechanic && (
                              <div>Assigned to: {request.mechanic.firstName} {request.mechanic.lastName}</div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {['ACCEPTED', 'IN_PROGRESS'].includes(request.status) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('tracking');
                                  setSelectedServiceRequest(request.id);
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
                              >
                                Track Progress
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                            >
                              View Details
                            </button>
                            {canCancelRequest(request) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelRequest(request.id);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
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

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                <PaymentHistory
                  onViewInvoice={handleViewInvoice}
                />
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Service Tracking</h2>

                {activeRequests.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <div className="text-4xl mb-4">🚗</div>
                    <p className="text-gray-600 mb-4">No active services to track.</p>
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      View Requests
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Service Request to Track:
                      </label>
                      <select
                        id="service-select"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={selectedServiceRequest || ''}
                        onChange={(e) => {
                          const requestId = parseInt(e.target.value);
                          setSelectedServiceRequest(requestId);
                          if (requestId) {
                            fetchVehicleStatuses(requestId);
                          }
                        }}
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
                            <LoadingSpinner size="lg" />
                            <p className="text-gray-500 mt-2">Loading tracking information...</p>
                          </div>
                        ) : vehicleStatuses.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No tracking information available yet.</p>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-6">Service Progress</h3>
                            <ServiceTrackingTimeline
                              statuses={vehicleStatuses}
                              onApproveStatus={handleApproveStatusUpdate}
                              onApproveAdditionalService={handleApproveAdditionalService}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'feedback' && (
              <div>
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">⭐</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Share Your Experience
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Help other customers by rating the garages you&apos;ve used.
                  </p>

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
      </main>

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
                amount={0}
                description={`Payment for Service Request #${selectedPaymentRequest.id}`}
                onSubmitSuccess={handlePaymentSuccess}
                onCancel={() => setShowPaymentForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showInvoiceDisplay && selectedInvoiceId !== null && (
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

            <div className="flex-1 min-w-0">
              <div className="mb-4">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    status.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {status.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(new Date(status.createdAt))}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-2">{status.description}</h3>
              </div>

              {/* Approval buttons */}
              {!status.approved && (
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => onApproveStatus(status.id, true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onApproveStatus(status.id, false)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* Ongoing Services */}
              {status.ongoingServices.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Ongoing Services:</h4>
                  <div className="space-y-2">
                    {status.ongoingServices.map((service) => (
                      <div key={service.id} className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-blue-900">{service.service.serviceName}</p>
                            <p className="text-sm text-blue-700">Price: ${service.service.estimatedPrice}</p>
                          </div>
                          <div className="text-right">
                            {service.serviceFinished ? (
                              <span className="text-green-600 font-medium text-sm">✓ Completed</span>
                            ) : (
                              <span className="text-blue-600 font-medium text-sm">⏳ In Progress</span>
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
                  <h4 className="font-medium text-gray-700 mb-2">Additional Services Requested:</h4>
                  <div className="space-y-2">
                    {status.additionalServices.map((service) => (
                      <div key={service.id} className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-orange-900">{service.service.serviceName}</p>
                            <p className="text-sm text-orange-700">Price: ${service.totalPrice}</p>
                            <p className="text-sm text-gray-600 mt-1">Additional service requested by mechanic</p>
                          </div>

                          {!service.approved && (
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={() => onApproveAdditionalService(service.id, true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => onApproveAdditionalService(service.id, false)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {service.approved && (
                            <div className="mt-2">
                              <span className="text-green-600 font-medium text-sm">✓ Approved</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
        <LoadingSpinner size="xl" />
      </div>
    }>
      <CustomerDashboardContent />
    </Suspense>
  );
}