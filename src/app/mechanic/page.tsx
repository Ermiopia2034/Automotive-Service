'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '@/utils/common';
import type { ServiceRequest, VehicleStatus, Notification, ServiceSummary, ServiceCompletionData } from '@/types/auth';

export default function MechanicDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'tracking' | 'notifications'>('requests');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Service tracking states
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleStatus[]>([]);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<number | null>(null);
  const [newStatusDescription, setNewStatusDescription] = useState('');
  const [availableServices, setAvailableServices] = useState<{ id: number; name: string; basePrice: number }[]>([]);

  // Service completion states
  const [completionModal, setCompletionModal] = useState<{ show: boolean; requestId: number | null }>({ show: false, requestId: null });
  const [serviceSummary, setServiceSummary] = useState<ServiceSummary | null>(null);
  const [completionData, setCompletionData] = useState<ServiceCompletionData>({
    serviceRequestId: 0,
    finalNotes: '',
    additionalCharges: 0,
    discount: 0
  });
  const [completingService, setCompletingService] = useState(false);

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

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=10');
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
      const response = await fetch(`/api/vehicle-status?service_request_id=${serviceRequestId}`);
      const result = await response.json();

      if (result.success) {
        setVehicleStatuses(result.data.statuses);
      }
    } catch (error) {
      console.error('Fetch vehicle statuses error:', error);
    }
  }, []);

  const fetchAvailableServices = useCallback(async () => {
    try {
      const response = await fetch('/api/services');
      const result = await response.json();

      if (result.success) {
        setAvailableServices(result.data.services);
      }
    } catch (error) {
      console.error('Fetch services error:', error);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchNotifications();
    fetchAvailableServices();
  }, [fetchRequests, fetchNotifications, fetchAvailableServices]);

  const handleStatusUpdate = async (requestId: number, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      setError('');

      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchRequests();
        setSelectedRequest(null);
      } else {
        setError(result.error || 'Failed to update request status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      setError('Failed to update request status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddVehicleStatus = async () => {
    if (!selectedServiceRequest || !newStatusDescription.trim()) return;

    try {
      setError('');

      const response = await fetch('/api/vehicle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceRequestId: selectedServiceRequest,
          description: newStatusDescription.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNewStatusDescription('');
        await fetchVehicleStatuses(selectedServiceRequest);
      } else {
        setError(result.error || 'Failed to add vehicle status');
      }
    } catch (error) {
      console.error('Add vehicle status error:', error);
      setError('Failed to add vehicle status');
    }
  };

  const handleAddOngoingService = async (statusId: number, serviceId: number, expectedDate: string, totalPrice: number) => {
    try {
      setError('');

      const response = await fetch('/api/ongoing-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusId,
          serviceId,
          expectedDate,
          totalPrice
        }),
      });

      const result = await response.json();

      if (result.success && selectedServiceRequest) {
        await fetchVehicleStatuses(selectedServiceRequest);
      } else {
        setError(result.error || 'Failed to add ongoing service');
      }
    } catch (error) {
      console.error('Add ongoing service error:', error);
      setError('Failed to add ongoing service');
    }
  };

  const handleCompleteService = async (serviceId: number, totalPrice?: number) => {
    try {
      setError('');

      const response = await fetch(`/api/ongoing-services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceFinished: true,
          ...(totalPrice !== undefined && { totalPrice })
        }),
      });

      const result = await response.json();

      if (result.success && selectedServiceRequest) {
        await fetchVehicleStatuses(selectedServiceRequest);
      } else {
        setError(result.error || 'Failed to complete service');
      }
    } catch (error) {
      console.error('Complete service error:', error);
      setError('Failed to complete service');
    }
  };

  const handleAddAdditionalService = async (statusId: number, serviceId: number, totalPrice: number) => {
    try {
      setError('');

      const response = await fetch('/api/additional-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusId,
          serviceId,
          totalPrice
        }),
      });

      const result = await response.json();

      if (result.success && selectedServiceRequest) {
        await fetchVehicleStatuses(selectedServiceRequest);
      } else {
        setError(result.error || 'Failed to request additional service');
      }
    } catch (error) {
      console.error('Add additional service error:', error);
      setError('Failed to request additional service');
    }
  };

  const fetchServiceSummary = async (requestId: number) => {
    try {
      setError('');

      const response = await fetch(`/api/service-completion?service_request_id=${requestId}`);
      const result = await response.json();

      if (result.success) {
        setServiceSummary(result.data.summary);
      } else {
        setError(result.error || 'Failed to fetch service summary');
      }
    } catch (error) {
      console.error('Fetch service summary error:', error);
      setError('Failed to fetch service summary');
    }
  };

  const handleOpenCompletionModal = (requestId: number) => {
    setCompletionModal({ show: true, requestId });
    setCompletionData({
      serviceRequestId: requestId,
      finalNotes: '',
      additionalCharges: 0,
      discount: 0
    });
    fetchServiceSummary(requestId);
  };

  const handleCompleteServiceRequest = async () => {
    if (!completionModal.requestId) return;

    try {
      setCompletingService(true);
      setError('');

      const response = await fetch('/api/service-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionData),
      });

      const result = await response.json();

      if (result.success) {
        setCompletionModal({ show: false, requestId: null });
        setServiceSummary(null);
        await fetchRequests();
      } else {
        setError(result.error || 'Failed to complete service');
      }
    } catch (error) {
      console.error('Complete service error:', error);
      setError('Failed to complete service');
    } finally {
      setCompletingService(false);
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

  const canAcceptRequest = (request: ServiceRequest) => {
    return request.status === 'PENDING';
  };

  const canUpdateRequest = (request: ServiceRequest) => {
    return request.mechanicId && request.status !== 'COMPLETED' && request.status !== 'CANCELLED';
  };

  const assignedRequests = requests.filter(r => r.mechanicId && ['ACCEPTED', 'IN_PROGRESS'].includes(r.status));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Mechanic Dashboard</h1>
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
            {(['requests', 'tracking', 'notifications'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'requests' && 'Service Requests'}
                {tab === 'tracking' && 'Service Tracking'}
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

          {/* Service Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Status Filter */}
              <div className="bg-white shadow rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                    Filter by Status:
                  </label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Requests</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Service Requests */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Service Requests ({requests.length} found)
                  </h3>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading requests...</p>
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="mt-2">No service requests found.</p>
                      <p className="text-sm">Requests from your garage will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => (
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
                              {canAcceptRequest(request) && (
                                <button
                                  onClick={() => handleStatusUpdate(request.id, 'ACCEPTED')}
                                  disabled={updatingStatus}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-1 rounded-md text-sm font-medium"
                                >
                                  Accept
                                </button>
                              )}
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
            </div>
          )}

          {/* Service Tracking Tab */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Advanced Service Tracking
                  </h3>
                  
                  {assignedRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No active service requests assigned to you.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Service Request:
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
                          className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Choose a request</option>
                          {assignedRequests.map((request) => (
                            <option key={request.id} value={request.id}>
                              Request #{request.id} - {request.customer.firstName} {request.customer.lastName} ({request.vehicle.vehicleType})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedServiceRequest && (
                        <div className="space-y-6">
                          {/* Add Vehicle Status Update */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="text-md font-medium text-gray-900 mb-3">Add Status Update</h4>
                            <div className="space-y-3">
                              <textarea
                                value={newStatusDescription}
                                onChange={(e) => setNewStatusDescription(e.target.value)}
                                placeholder="Describe the current status or work performed..."
                                rows={3}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                onClick={handleAddVehicleStatus}
                                disabled={!newStatusDescription.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium"
                              >
                                Add Status Update
                              </button>
                            </div>
                          </div>

                          {/* Vehicle Status History */}
                          <div>
                            <h4 className="text-md font-medium text-gray-900 mb-3">Status Updates & Service Tracking</h4>
                            {vehicleStatuses.length === 0 ? (
                              <p className="text-gray-500">No status updates yet. Add your first update above.</p>
                            ) : (
                              <div className="space-y-4">
                                {vehicleStatuses.map((status) => (
                                  <div key={status.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        status.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {status.approved ? 'Approved by Customer' : 'Pending Customer Approval'}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        {formatDateTime(new Date(status.createdAt))}
                                      </span>
                                    </div>
                                    <p className="text-gray-900 mb-3">{status.description}</p>
                                    
                                    {/* Ongoing Services */}
                                    {status.ongoingServices.length > 0 && (
                                      <div className="mb-3">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Ongoing Services:</h5>
                                        <div className="space-y-2">
                                          {status.ongoingServices.map((service) => (
                                            <div key={service.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                              <div>
                                                <span className="text-sm font-medium">{service.service.serviceName}</span>
                                                <span className="text-sm text-gray-600"> - Expected: {new Date(service.expectedDate).toLocaleDateString()}</span>
                                                <span className="text-sm text-gray-600"> - ${service.totalPrice}</span>
                                              </div>
                                              {!service.serviceFinished && (
                                                <button
                                                  onClick={() => handleCompleteService(service.id)}
                                                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                                >
                                                  Mark Complete
                                                </button>
                                              )}
                                              {service.serviceFinished && (
                                                <span className="text-green-600 text-xs font-medium">✓ Completed</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
        
                                    {/* Service Completion Button */}
                                    {status.approved &&
                                     vehicleStatuses.some(s => s.approved && s.ongoingServices.some(os => !os.serviceFinished)) &&
                                     selectedServiceRequest && (
                                      <div className="mt-3 pt-3 border-t border-green-200">
                                        <button
                                          onClick={() => handleOpenCompletionModal(selectedServiceRequest)}
                                          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
                                        >
                                          🎉 Complete Service Request
                                        </button>
                                        <p className="text-xs text-green-600 mt-1 text-center">
                                          Generate final invoice and complete this service
                                        </p>
                                      </div>
                                    )}

                                    {/* Additional Services */}
                                    {status.additionalServices.length > 0 && (
                                      <div className="mb-3">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Additional Services Requested:</h5>
                                        <div className="space-y-2">
                                          {status.additionalServices.map((service) => (
                                            <div key={service.id} className="flex items-center justify-between bg-orange-50 p-2 rounded">
                                              <div>
                                                <span className="text-sm font-medium">{service.service.serviceName}</span>
                                                <span className="text-sm text-gray-600"> - ${service.totalPrice}</span>
                                              </div>
                                              <span className={`text-xs font-medium ${
                                                service.approved ? 'text-green-600' : 'text-yellow-600'
                                              }`}>
                                                {service.approved ? '✓ Customer Approved' : '⏳ Awaiting Customer Approval'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Service Management Actions */}
                                    {status.approved && (
                                      <ServiceActionButtons
                                        statusId={status.id}
                                        availableServices={availableServices}
                                        onAddOngoingService={handleAddOngoingService}
                                        onAddAdditionalService={handleAddAdditionalService}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Notifications ({notifications.filter(n => !n.read).length} unread)
                </h3>
                
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No notifications yet.</p>
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
                      </div>
                    ))}
                  </div>
                )}
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

                    {/* Status Update Actions */}
                    {canUpdateRequest(selectedRequest) && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Update Status</h4>
                        <div className="flex space-x-2">
                          {selectedRequest.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handleStatusUpdate(selectedRequest.id, 'IN_PROGRESS')}
                              disabled={updatingStatus}
                              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-3 py-1 rounded-md text-sm font-medium"
                            >
                              Start Work
                            </button>
                          )}
                          {selectedRequest.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleStatusUpdate(selectedRequest.id, 'COMPLETED')}
                              disabled={updatingStatus}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-1 rounded-md text-sm font-medium"
                            >
                              Mark Complete
                            </button>
                          )}
                          {['ACCEPTED', 'IN_PROGRESS'].includes(selectedRequest.status) && (
                            <button
                              onClick={() => handleStatusUpdate(selectedRequest.id, 'CANCELLED')}
                              disabled={updatingStatus}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-3 py-1 rounded-md text-sm font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canAcceptRequest(selectedRequest) && (
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'ACCEPTED')}
                          disabled={updatingStatus}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-md font-medium"
                        >
                          {updatingStatus ? 'Accepting...' : 'Accept Request'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Completion Modal */}
          {completionModal.show && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Complete Service Request #{completionModal.requestId}
                    </h3>
                    <button
                      onClick={() => setCompletionModal({ show: false, requestId: null })}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {serviceSummary && (
                    <div className="space-y-4">
                      {/* Service Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Service Summary</h4>
                        <div className="space-y-2 text-sm">
                          {serviceSummary.completedServices.map((service) => (
                            <div key={`${service.type}-${service.id}`} className="flex justify-between">
                              <span>{service.serviceName} {service.type === 'additional' && '(Additional)'}</span>
                              <span>${service.price}</span>
                            </div>
                          ))}
                          <div className="border-t pt-2 font-medium">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>${serviceSummary.subtotal}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Charges and Discount */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Additional Charges ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={completionData.additionalCharges}
                            onChange={(e) => setCompletionData({
                              ...completionData,
                              additionalCharges: parseFloat(e.target.value) || 0
                            })}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-500 mt-1">Parts, materials, etc.</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Discount ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={completionData.discount}
                            onChange={(e) => setCompletionData({
                              ...completionData,
                              discount: parseFloat(e.target.value) || 0
                            })}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-500 mt-1">Customer discount</p>
                        </div>
                      </div>

                      {/* Final Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Final Notes (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={completionData.finalNotes}
                          onChange={(e) => setCompletionData({
                            ...completionData,
                            finalNotes: e.target.value
                          })}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Any final notes or recommendations for the customer..."
                        />
                      </div>

                      {/* Final Total */}
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-green-900">Final Total:</span>
                          <span className="text-2xl font-bold text-green-900">
                            ${(serviceSummary.subtotal + (completionData.additionalCharges || 0) - (completionData.discount || 0)).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          This amount will be sent to the customer for payment.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={() => setCompletionModal({ show: false, requestId: null })}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCompleteServiceRequest}
                          disabled={completingService}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-md font-medium"
                        >
                          {completingService ? 'Completing...' : '🎉 Complete Service'}
                        </button>
                      </div>

                      <div className="text-xs text-gray-500 text-center pt-2">
                        This will mark the service as completed and notify the customer.
                      </div>
                    </div>
                  )}

                  {!serviceSummary && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Calculating service summary...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Service Action Buttons Component
function ServiceActionButtons({ 
  statusId, 
  availableServices, 
  onAddOngoingService, 
  onAddAdditionalService 
}: {
  statusId: number;
  availableServices: { id: number; name: string; basePrice: number }[];
  onAddOngoingService: (statusId: number, serviceId: number, expectedDate: string, totalPrice: number) => void;
  onAddAdditionalService: (statusId: number, serviceId: number, totalPrice: number) => void;
}) {
  const [showOngoingForm, setShowOngoingForm] = useState(false);
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [totalPrice, setTotalPrice] = useState('');

  const handleAddOngoing = () => {
    if (selectedService && expectedDate && totalPrice) {
      onAddOngoingService(statusId, parseInt(selectedService), expectedDate, parseFloat(totalPrice));
      setShowOngoingForm(false);
      setSelectedService('');
      setExpectedDate('');
      setTotalPrice('');
    }
  };

  const handleAddAdditional = () => {
    if (selectedService && totalPrice) {
      onAddAdditionalService(statusId, parseInt(selectedService), parseFloat(totalPrice));
      setShowAdditionalForm(false);
      setSelectedService('');
      setTotalPrice('');
    }
  };

  return (
    <div className="pt-3 border-t border-gray-200">
      <h5 className="text-sm font-medium text-gray-700 mb-3">Service Management</h5>
      <div className="flex space-x-2 mb-3">
        <button
          onClick={() => setShowOngoingForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
        >
          Add Service
        </button>
        <button
          onClick={() => setShowAdditionalForm(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs"
        >
          Request Additional
        </button>
      </div>

      {showOngoingForm && (
        <div className="bg-blue-50 p-3 rounded-lg mb-3">
          <h6 className="text-sm font-medium mb-2">Add Ongoing Service</h6>
          <div className="space-y-2">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full text-xs border-gray-300 rounded"
            >
              <option value="">Select service</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} (Est. ${service.basePrice})
                </option>
              ))}
            </select>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full text-xs border-gray-300 rounded"
              placeholder="Expected completion date"
            />
            <input
              type="number"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              className="w-full text-xs border-gray-300 rounded"
              placeholder="Total price"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAddOngoing}
                disabled={!selectedService || !expectedDate || !totalPrice}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-2 py-1 rounded text-xs"
              >
                Add
              </button>
              <button
                onClick={() => setShowOngoingForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdditionalForm && (
        <div className="bg-orange-50 p-3 rounded-lg">
          <h6 className="text-sm font-medium mb-2">Request Additional Service</h6>
          <div className="space-y-2">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full text-xs border-gray-300 rounded"
            >
              <option value="">Select service</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} (Est. ${service.basePrice})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              className="w-full text-xs border-gray-300 rounded"
              placeholder="Total price"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAddAdditional}
                disabled={!selectedService || !totalPrice}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-2 py-1 rounded text-xs"
              >
                Request
              </button>
              <button
                onClick={() => setShowAdditionalForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}