'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

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
  garageServices?: {
    garage: {
      id: number;
      garageName: string;
      approved: boolean;
    };
    available: boolean;
  }[];
}

export default function ServicesManagement() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    serviceName: '',
    estimatedPrice: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/services?include_removed=true');
      const result = await response.json();

      if (result.success) {
        setServices(result.data.services);
      } else {
        setError(result.error || 'Failed to fetch services');
      }
    } catch (error) {
      console.error('Fetch services error:', error);
      setError('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceName: formData.serviceName,
          estimatedPrice: parseFloat(formData.estimatedPrice)
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowCreateForm(false);
        setFormData({ serviceName: '', estimatedPrice: '' });
        fetchServices(); // Refresh the list
      } else {
        setError(result.error || 'Failed to create service');
      }
    } catch (error) {
      console.error('Create service error:', error);
      setError('Failed to create service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/services/${editingService.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceName: formData.serviceName,
          estimatedPrice: parseFloat(formData.estimatedPrice)
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEditingService(null);
        setFormData({ serviceName: '', estimatedPrice: '' });
        fetchServices(); // Refresh the list
      } else {
        setError(result.error || 'Failed to update service');
      }
    } catch (error) {
      console.error('Update service error:', error);
      setError('Failed to update service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to remove this service? This will make it unavailable for all garages.')) {
      return;
    }

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        fetchServices(); // Refresh the list
      } else {
        setError(result.error || 'Failed to remove service');
      }
    } catch (error) {
      console.error('Remove service error:', error);
      setError('Failed to remove service');
    }
  };

  const handleRestoreService = async (serviceId: number) => {
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ removed: false }),
      });

      const result = await response.json();

      if (result.success) {
        fetchServices(); // Refresh the list
      } else {
        setError(result.error || 'Failed to restore service');
      }
    } catch (error) {
      console.error('Restore service error:', error);
      setError('Failed to restore service');
    }
  };

  const startEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      serviceName: service.serviceName,
      estimatedPrice: service.estimatedPrice.toString()
    });
  };

  const cancelEdit = () => {
    setEditingService(null);
    setFormData({ serviceName: '', estimatedPrice: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/system-admin')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
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

          {/* Create Service Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create New Service
            </button>
          </div>

          {/* Create Service Form */}
          {showCreateForm && (
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Service</h3>
              <form onSubmit={handleCreateService} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Name</label>
                  <input
                    type="text"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimatedPrice}
                    onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Service'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ serviceName: '', estimatedPrice: '' });
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Service Form */}
          {editingService && (
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Service</h3>
              <form onSubmit={handleEditService} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Name</label>
                  <input
                    type="text"
                    value={formData.serviceName}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimatedPrice}
                    onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Updating...' : 'Update Service'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Services List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">All Services</h3>
              
              {loading ? (
                <div className="text-center py-4">Loading services...</div>
              ) : services.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No services found.</div>
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
                          Created By
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
                      {services.map((service) => (
                        <tr key={service.id} className={service.removed ? 'opacity-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {service.serviceName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${service.estimatedPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {service.creator.firstName} {service.creator.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              service.removed 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {service.removed ? 'Removed' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {!service.removed && (
                              <>
                                <button
                                  onClick={() => startEdit(service)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleRemoveService(service.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                            {service.removed && (
                              <button
                                onClick={() => handleRestoreService(service.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}