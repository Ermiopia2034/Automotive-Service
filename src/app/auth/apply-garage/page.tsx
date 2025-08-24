'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ApiResponse, GarageApplicationData } from '@/types/auth';

export default function ApplyGaragePage() {
  const [formData, setFormData] = useState<GarageApplicationData>({
    garageName: '',
    latitude: 0,
    longitude: 0,
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationError, setLocationError] = useState('');
  const router = useRouter();

  const getCurrentLocation = () => {
    setGettingLocation(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGettingLocation(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setLocationError(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.garageName.trim()) {
      setError('Garage name is required');
      setLoading(false);
      return;
    }

    if (!formData.adminEmail.trim() || !formData.adminUsername.trim() ||
        !formData.adminPassword.trim() || !formData.adminFirstName.trim() ||
        !formData.adminLastName.trim()) {
      setError('All admin fields are required');
      setLoading(false);
      return;
    }

    if (formData.latitude === 0 || formData.longitude === 0) {
      setError('Location is required. Please get your current location or enter coordinates manually.');
      setLoading(false);
      return;
    }

    try {
      const applicationData: GarageApplicationData & { type: string } = {
        type: 'GARAGE',
        garageName: formData.garageName.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        adminEmail: formData.adminEmail.trim(),
        adminUsername: formData.adminUsername.trim(),
        adminPassword: formData.adminPassword,
        adminFirstName: formData.adminFirstName.trim(),
        adminLastName: formData.adminLastName.trim(),
      };

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        setSuccess('Garage application submitted successfully! You will be notified once it is reviewed by the system administrator.');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      } else {
        setError(data.error || 'Application submission failed');
      }
    } catch (error) {
      console.error('Application error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'latitude' || name === 'longitude') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Apply as Garage Owner
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Register your automotive service garage
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="garageName" className="block text-sm font-medium text-gray-700 mb-2">
              Garage Name *
            </label>
            <input
              id="garageName"
              name="garageName"
              type="text"
              required
              value={formData.garageName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your garage name"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Garage Administrator Information</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    id="adminFirstName"
                    name="adminFirstName"
                    type="text"
                    required
                    value={formData.adminFirstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    id="adminLastName"
                    name="adminLastName"
                    type="text"
                    required
                    value={formData.adminLastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Last Name"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="admin@garage.com"
                />
              </div>

              <div>
                <label htmlFor="adminUsername" className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  id="adminUsername"
                  name="adminUsername"
                  type="text"
                  required
                  value={formData.adminUsername}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="admin_username"
                />
              </div>

              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  id="adminPassword"
                  name="adminPassword"
                  type="password"
                  required
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Secure password"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Location *
              </label>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className={`text-sm px-3 py-1 rounded ${
                  gettingLocation
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {gettingLocation ? 'Getting Location...' : 'Get Current Location'}
              </button>
            </div>

            {locationError && (
              <div className="text-red-600 text-sm mb-2">{locationError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-xs font-medium text-gray-600 mb-1">
                  Latitude
                </label>
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  required
                  value={formData.latitude || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-xs font-medium text-gray-600 mb-1">
                  Longitude
                </label>
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  required
                  value={formData.longitude || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.0"
                />
              </div>
            </div>

            {formData.latitude !== 0 && formData.longitude !== 0 && (
              <div className="mt-2 text-xs text-green-600">
                ✓ Location set: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Application Process:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your application will be reviewed by the system administrator</li>
              <li>• You will be notified via email once a decision is made</li>
              <li>• If approved, you will become a garage administrator</li>
              <li>• You can then manage mechanics and service requests</li>
              <li>• Your garage will be visible to customers looking for services</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Location Requirements:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Accurate location helps customers find your garage</li>
              <li>• Location is used for distance calculations</li>
              <li>• You can use GPS for automatic location detection</li>
              <li>• Or enter coordinates manually if you know them</li>
            </ul>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {loading ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>

          <div className="text-center">
            <div className="text-sm space-y-2">
              <div>
                <Link
                  href="/auth/signin"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  Back to Sign In
                </Link>
              </div>
              <div>
                <span className="text-gray-600">Want to apply as a mechanic instead? </span>
                <Link
                  href="/auth/apply-mechanic"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  Apply as Mechanic
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}