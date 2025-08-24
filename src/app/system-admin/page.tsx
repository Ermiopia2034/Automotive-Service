'use client';

import { useRouter } from 'next/navigation';

export default function SystemAdminDashboard() {
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
          <h1 className="text-3xl font-bold text-gray-900">System Admin Dashboard</h1>
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
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome, System Administrator!</h2>
              <p className="text-gray-600">
                System administration features will be implemented in future milestones.
              </p>
              <div className="mt-6 space-y-2">
                <div className="text-sm text-gray-500">Available features:</div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Garage management</li>
                  <li>• Service catalog management</li>
                  <li>• User management</li>
                  <li>• Application approvals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}