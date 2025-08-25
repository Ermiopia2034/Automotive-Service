'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { getCurrentLocation } from '@/utils/common';

interface Vehicle {
  id: number;
  vehicleType: string;
  plateNumber: string;
  plateCode: string;
  countryCode: string;
  color: string;
}

interface Garage {
  id: number;
  garageName: string;
  latitude: number;
  longitude: number;
  rating: number;
  admin: {
    firstName: string;
    lastName: string;
  };
  services: Array<{
    service: {
      id: number;
      serviceName: string;
      estimatedPrice: number;
    };
  }>;
}

function RequestServiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const garageId = searchParams.get('garage_id');
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [garage, setGarage] = useState<Garage | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  const fetchUserVehicles = useCallback(async () => {
    try {
      const response = await fetch('/api/vehicles');
      const result = await response.json();

      if (result.success) {
        setVehicles(result.data.vehicles);
      } else {
        setError(result.error || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Fetch vehicles error:', error);
      setError('Failed to fetch vehicles');
    }
  }, []);

  const fetchGarageDetails = useCallback(async () => {
    if (!garageId) return;
    
    try {
      const response = await fetch(`/api/garages?garage_id=${garageId}`);
      const result = await response.json();

      if (result.success && result.data.garages.length > 0) {
        setGarage(result.data.garages[0]);
      } else {
        setError('Garage not found');
      }
    } catch (error) {
      console.error('Fetch garage error:', error);
      setError('Failed to fetch garage details');
    }
  }, [garageId]);

  const getUserLocation = async () => {
    try {
      setLocationError('');
      const position = await getCurrentLocation();
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Unable to get your location. Please enable location services and try again.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserVehicles(),
        fetchGarageDetails(),
        getUserLocation()
      ]);
      setLoading(false);
    };

    initialize();
  }, [fetchUserVehicles, fetchGarageDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicle || !garageId || !userLocation) {
      setError('Please select a vehicle and ensure location is detected');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          garageId: parseInt(garageId),
          vehicleId: selectedVehicle,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          description
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/customer?tab=requests&success=Service request submitted successfully');
      } else {
        setError(result.error || 'Failed to submit service request');
      }
    } catch (error) {
      console.error('Submit request error:', error);
      setError('Failed to submit service request');
    } finally {
      setSubmitting(false);
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

  if (!garageId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Request</h1>
          <p className="text-gray-600 mb-4">No garage specified for service request.</p>
          <button
            onClick={() => router.push('/customer/garages')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Find Garages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Request Service</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push('/customer')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              {/* Garage Information */}
              {garage && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h2 className="text-lg font-semibold text-blue-900 mb-2">
                    Requesting Service From: {garage.garageName}
                  </h2>
                  <p className="text-sm text-blue-700">
                    Owner: {garage.admin.firstName} {garage.admin.lastName}
                  </p>
                  <p className="text-sm text-blue-700">
                    Rating: {garage.rating.toFixed(1)}/10
                  </p>
                  {garage.services.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-blue-700 mb-2">Available Services:</p>
                      <div className="flex flex-wrap gap-2">
                        {garage.services.slice(0, 5).map(({ service }) => (
                          <span
                            key={service.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {service.serviceName} (${service.estimatedPrice})
                          </span>
                        ))}
                        {garage.services.length > 5 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{garage.services.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Location Status */}
              {locationError && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between">
                  <span>{locationError}</span>
                  <button
                    onClick={getUserLocation}
                    className="bg-red-200 hover:bg-red-300 text-red-800 px-3 py-1 rounded text-sm"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {userLocation && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location detected successfully
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Service Request Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700">
                    Select Vehicle *
                  </label>
                  <select
                    id="vehicle"
                    value={selectedVehicle || ''}
                    onChange={(e) => setSelectedVehicle(e.target.value ? parseInt(e.target.value) : null)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    required
                  >
                    <option value="" className="text-gray-900">Choose a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id} className="text-gray-900">
                        {vehicle.vehicleType} - {vehicle.plateCode} {vehicle.plateNumber} ({vehicle.color})
                      </option>
                    ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      No vehicles found. Please{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/customer/profile')}
                        className="text-blue-600 hover:text-blue-500 underline"
                      >
                        add a vehicle
                      </button>{' '}
                      to your profile first.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Problem Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue with your vehicle or specify the type of service needed..."
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">What happens next?</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Your request will be sent to the selected garage</li>
                    <li>• A mechanic will review and accept your request</li>
                    <li>• You&apos;ll receive updates on the status of your service</li>
                    <li>• The mechanic will contact you with further details</li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedVehicle || !userLocation || vehicles.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-md font-medium"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RequestService() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <RequestServiceContent />
    </Suspense>
  );
}