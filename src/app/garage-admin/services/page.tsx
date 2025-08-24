'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface Service {
  id: number;
  serviceName: string;
  estimatedPrice: number;
  removed: boolean;
  creator: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface GarageService {
  id: number;
  garageId: number;
  serviceId: number;
  available: boolean;
  service: Service;
}

export default function GarageServicesManagement() {
  const router = useRouter();
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [garageServices, setGarageServices] = useState<GarageService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [garageId, setGarageId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGarageProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/garages/profile');
      const result = await response.json();

      if (result.success && result.data.garage) {
        setGarageId(result.data.garage.id);
        return result.data.garage.id;
      } else {
        setError('Could not load garage profile');
        return null;
      }
    } catch (error) {
      console.error('Fetch garage profile error:', error);
      setError('Failed to load garage profile');
      return null;
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch('/api/services');
      const result = await response.json();

      if (result.success) {
        setAllServices(result.data.services);
      } else {
        setError(result.error || 'Failed to fetch services');
      }
    } catch (error) {
      console.error('Fetch services error:', error);
      setError('Failed to fetch services');
    }
  }, []);

  const fetchGarageServices = useCallback(async (gId: number) => {
    try {
      const response = await fetch(`/api/garages/${gId}/services?include_unavailable=true`);
      const result = await response.json();

      if (result.success) {
        setGarageServices(result.data.garageServices);
      } else {
        setError(result.error || 'Failed to fetch garage services');
      }
    } catch (error) {
      console.error('Fetch garage services error:', error);
      setError('Failed to fetch garage services');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const gId = await fetchGarageProfile();
    if (gId) {
      await Promise.all([fetchServices(), fetchGarageServices(gId)]);
    }
    setLoading(false);
  }, [fetchGarageProfile, fetchServices, fetchGarageServices]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAddService = async (serviceId: number) => {
    if (!garageId) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/garages/${garageId}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          available: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchGarageServices(garageId); // Refresh garage services
      } else {
        setError(result.error || 'Failed to add service');
      }
    } catch (error) {
      console.error('Add service error:', error);
      setError('Failed to add service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (serviceId: number, currentAvailability: boolean) => {
    if (!garageId) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/garages/${garageId}/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          available: !currentAvailability
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchGarageServices(garageId); // Refresh garage services
      } else {
        setError(result.error || 'Failed to update service availability');
      }
    } catch (error) {
      console.error('Toggle availability error:', error);
      setError('Failed to update service availability');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveService = async (serviceId: number) => {
    if (!garageId) return;
    if (!confirm('Are you sure you want to remove this service from your garage?')) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/garages/${garageId}/services/${serviceId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await fetchGarageServices(garageId); // Refresh garage services
      } else {
        setError(result.error || 'Failed to remove service');
      }
    } catch (error) {
      console.error('Remove service error:', error);
      setError('Failed to remove service');
    } finally {
      setSubmitting(false);
    }
  };

  // Get services that are not already assigned to this garage
  const availableServices = allServices.filter(service => 
    !service.removed && 
    !garageServices.some(gs => gs.serviceId === service.id)
  );

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
            <h1 className="text-3xl font-bold text-gray-900">Garage Services</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push('/garage-admin/profile')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Garage Profile
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
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading services...</p>
            </div>
          ) : (
            <>
              {/* Current Garage Services */}
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Your Garage Services ({garageServices.length})
                  </h3>
                  
                  {garageServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                      </svg>
                      <p className="mt-2">No services assigned to your garage yet.</p>
                      <p className="text-sm text-gray-400">Add services from the available services below.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Service Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price ($)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {garageServices.map((garageService) => (
                            <tr key={garageService.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {garageService.service.serviceName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${garageService.service.estimatedPrice.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  garageService.available 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {garageService.available ? 'Available' : 'Unavailable'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => handleToggleAvailability(garageService.serviceId, garageService.available)}
                                  disabled={submitting}
                                  className={`${
                                    garageService.available 
                                      ? 'text-yellow-600 hover:text-yellow-900' 
                                      : 'text-green-600 hover:text-green-900'
                                  } disabled:opacity-50`}
                                >
                                  {garageService.available ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  onClick={() => handleRemoveService(garageService.serviceId)}
                                  disabled={submitting}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Available Services to Add */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Available Services to Add ({availableServices.length})
                  </h3>
                  
                  {availableServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>All available services have been added to your garage.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableServices.map((service) => (
                        <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="text-lg font-medium text-gray-900 mb-2">
                            {service.serviceName}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            Estimated Price: ${service.estimatedPrice.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mb-4">
                            Created by: {service.creator.firstName} {service.creator.lastName}
                          </p>
                          <button
                            onClick={() => handleAddService(service.id)}
                            disabled={submitting}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                          >
                            {submitting ? 'Adding...' : 'Add to Garage'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}