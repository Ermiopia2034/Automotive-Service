'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ApiResponse, VehicleData } from '@/types/auth';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  userType: string;
  createdAt: string;
  updatedAt: string;
}

interface Vehicle {
  id: number;
  customerId: number;
  vehicleType: string;
  plateNumber: string;
  plateCode: string;
  countryCode: string;
  color: string;
}

interface ProfileUpdateData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export default function CustomerProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  const [vehicleData, setVehicleData] = useState<VehicleData>({
    vehicleType: '',
    plateNumber: '',
    plateCode: '',
    countryCode: '',
    color: '',
  });

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchVehicles();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      const data: ApiResponse<{ user: User }> = await response.json();

      if (response.ok && data.success) {
        setUser(data.data!.user);
        setProfileData({
          firstName: data.data!.user.firstName,
          lastName: data.data!.user.lastName,
          phoneNumber: data.data!.user.phoneNumber || '',
        });
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data: ApiResponse<{ vehicles: Vehicle[] }> = await response.json();

      if (response.ok && data.success) {
        setVehicles(data.data!.vehicles);
      }
    } catch (error) {
      console.error('Vehicles fetch error:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data: ApiResponse<{ user: User }> = await response.json();

      if (response.ok && data.success) {
        setUser(data.data!.user);
        setSuccess('Profile updated successfully');
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

  const handleVehicleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingVehicle(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });

      const data: ApiResponse<{ vehicle: Vehicle }> = await response.json();

      if (response.ok && data.success) {
        setVehicles(prev => [data.data!.vehicle, ...prev]);
        setVehicleData({
          vehicleType: '',
          plateNumber: '',
          plateCode: '',
          countryCode: '',
          color: '',
        });
        setShowVehicleForm(false);
        setSuccess('Vehicle added successfully');
      } else {
        setError(data.error || 'Vehicle registration failed');
      }
    } catch (error) {
      console.error('Vehicle registration error:', error);
      setError('Network error');
    } finally {
      setAddingVehicle(false);
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
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Profile</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your account and vehicles</p>
          </div>
          <div className="flex space-x-2">
            <Link
              href="/customer"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-gray-700">Username:</strong>
                  <p className="text-gray-900">{user?.username}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Email:</strong>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Member Since:</strong>
                  <p className="text-gray-900">{new Date(user?.createdAt || '').toLocaleDateString()}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Account Type:</strong>
                  <p className="text-gray-900">Customer</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={profileData.phoneNumber}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                {updating ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          {/* Vehicle Management */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">My Vehicles</h2>
              <button
                onClick={() => setShowVehicleForm(!showVehicleForm)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {showVehicleForm ? 'Cancel' : 'Add Vehicle'}
              </button>
            </div>

            {showVehicleForm && (
              <form onSubmit={handleVehicleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      id="vehicleType"
                      value={vehicleData.vehicleType}
                      onChange={(e) => setVehicleData(prev => ({ ...prev, vehicleType: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Toyota Camry"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <input
                      type="text"
                      id="color"
                      value={vehicleData.color}
                      onChange={(e) => setVehicleData(prev => ({ ...prev, color: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Blue"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-700">
                      Plate Number
                    </label>
                    <input
                      type="text"
                      id="plateNumber"
                      value={vehicleData.plateNumber}
                      onChange={(e) => setVehicleData(prev => ({ ...prev, plateNumber: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="12345"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="plateCode" className="block text-sm font-medium text-gray-700">
                      Plate Code
                    </label>
                    <input
                      type="text"
                      id="plateCode"
                      value={vehicleData.plateCode}
                      onChange={(e) => setVehicleData(prev => ({ ...prev, plateCode: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="AA"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
                      Country Code
                    </label>
                    <input
                      type="text"
                      id="countryCode"
                      value={vehicleData.countryCode}
                      onChange={(e) => setVehicleData(prev => ({ ...prev, countryCode: e.target.value }))}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="ET"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addingVehicle}
                  className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    addingVehicle
                      ? 'bg-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
                >
                  {addingVehicle ? 'Adding...' : 'Add Vehicle'}
                </button>
              </form>
            )}

            <div className="space-y-4">
              {vehicles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No vehicles registered yet.</p>
              ) : (
                vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{vehicle.vehicleType}</h3>
                        <p className="text-sm text-gray-600">Color: {vehicle.color}</p>
                        <p className="text-sm text-gray-600">
                          Plate: {vehicle.plateCode} {vehicle.plateNumber} ({vehicle.countryCode})
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}