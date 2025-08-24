'use client';

import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
          <div className="flex space-x-2">
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
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome, Customer!</h2>
              <p className="text-gray-600 mb-6">
                Manage your profile, vehicles, and find nearby automotive services.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => router.push('/customer/profile')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Manage Profile
                </button>
                <button
                  onClick={() => router.push('/customer/profile')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  My Vehicles
                </button>
                <button
                  onClick={() => router.push('/customer/garages')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Find Garages
                </button>
              </div>

              <div className="mt-8 space-y-2">
                <div className="text-sm text-gray-500">New in Milestone 3:</div>
                <ul className="text-sm text-green-600 space-y-1 font-medium">
                  <li>• ✓ Locate nearby garages</li>
                  <li>• ✓ Browse available services</li>
                  <li>• ✓ Filter by distance and rating</li>
                </ul>
                <div className="text-sm text-gray-500 mt-4">Coming next:</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Request assistance</li>
                  <li>• Track service status</li>
                  <li>• Rate and review services</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}