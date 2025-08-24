'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ApiResponse } from '@/types/auth';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Mechanic {
  id: number;
  userId: number;
  garageId: number;
  approved: boolean;
  removed: boolean;
  user: User;
}

interface Garage {
  id: number;
  garageName: string;
  adminId: number;
  latitude: number;
  longitude: number;
  rating: number;
  available: boolean;
  removed: boolean;
  approved: boolean;
  createdAt: string;
  admin: User;
  mechanics: Mechanic[];
  _count: {
    serviceRequests: number;
    ratings: number;
  };
}

interface GarageProfileUpdateData {
  garageName: string;
  latitude: number;
  longitude: number;
  available: boolean;
}

export default function GarageProfilePage() {
  const [garage, setGarage] = useState<Garage | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [locationError, setLocationError] = useState('');
  
  const [profileData, setProfileData] = useState<GarageProfileUpdateData>({
    garageName: '',
    latitude: 0,
    longitude: 0,
    available: true,
  });

  const router = useRouter();

  useEffect(() => {
    fetchGarageProfile();
  }, []);

  const fetchGarageProfile = async () => {
    try {
      const response = await fetch('/api/garages/profile');
      const data: ApiResponse<{ garage: Garage }> = await response.json();

      if (response.ok && data.success) {
        setGarage(data.data!.garage);
        setProfileData({
          garageName: data.data!.garage.garageName,
          latitude: data.data!.garage.latitude,
          longitude: data.data!.garage.longitude,
          available: data.data!.garage.available,
        });
      } else {
        setError(data.error || 'Failed to load garage profile');
      }
    } catch (error) {
      console.error('Garage profile fetch error:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

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
        setProfileData(prev => ({
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/garages/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data: ApiResponse<{ garage: Garage }> = await response.json();

      if (response.ok && data.success) {
        setGarage(data.data!.garage);
        setSuccess('Garage profile updated successfully');
      } else {
        setError(data.error || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Network error');
    } finally {
      setUpdating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setProfileData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else if (name === 'latitude' || name === 'longitude') {
      setProfileData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value,
      }));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading garage profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Garage Profile</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your garage information and settings</p>
          </div>
          <div className="flex space-x-2">
            <Link
              href="/garage-admin"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
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
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Garage Information */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Garage Information</h2>
            
            {garage && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-gray-700">Status:</strong>
                    <p className={`${garage.available ? 'text-green-600' : 'text-red-600'}`}>
                      {garage.available ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                  <div>
                    <strong className="text-gray-700">Rating:</strong>
                    <p className="text-gray-900">{garage.rating.toFixed(1)}/10</p>
                  </div>
                  <div>
                    <strong className="text-gray-700">Service Requests:</strong>
                    <p className="text-gray-900">{garage._count.serviceRequests}</p>
                  </div>
                  <div>
                    <strong className="text-gray-700">Total Ratings:</strong>
                    <p className="text-gray-900">{garage._count.ratings}</p>
                  </div>
                  <div className="col-span-2">
                    <strong className="text-gray-700">Established:</strong>
                    <p className="text-gray-900">{new Date(garage.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label htmlFor="garageName" className="block text-sm font-medium text-gray-700">
                  Garage Name
                </label>
                <input
                  type="text"
                  id="garageName"
                  name="garageName"
                  value={profileData.garageName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="available"
                  name="available"
                  checked={profileData.available}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                  Garage is available for new service requests
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Location
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
                    {gettingLocation ? 'Getting Location...' : 'Update Location'}
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
                      type="number"
                      step="any"
                      id="latitude"
                      name="latitude"
                      value={profileData.latitude || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="longitude" className="block text-xs font-medium text-gray-600 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      id="longitude"
                      name="longitude"
                      value={profileData.longitude || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={updating}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  updating
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {updating ? 'Updating...' : 'Update Garage Profile'}
              </button>
            </form>
          </div>

          {/* Mechanics List */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Mechanics</h2>
              <Link
                href="/garage-admin/applications"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Review Applications
              </Link>
            </div>

            <div className="space-y-4">
              {garage?.mechanics && garage.mechanics.length > 0 ? (
                garage.mechanics.map((mechanic) => (
                  <div key={mechanic.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900">
                      {mechanic.user.firstName} {mechanic.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">@{mechanic.user.username}</p>
                    <p className="text-sm text-gray-600">{mechanic.user.email}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <p>No mechanics assigned yet.</p>
                  <Link
                    href="/garage-admin/applications"
                    className="text-indigo-600 hover:text-indigo-500 text-sm mt-2 inline-block"
                  >
                    Review mechanic applications
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}