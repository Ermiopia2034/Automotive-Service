'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ApiResponse, MechanicApplicationData } from '@/types/auth';

interface Garage {
  id: number;
  garageName: string;
  adminId: number;
  latitude: number;
  longitude: number;
  rating: number;
  available: boolean;
  approved: boolean;
  createdAt: string;
  admin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ApplyMechanicPage() {
  const [garages, setGarages] = useState<Garage[]>([]);
  const [selectedGarageId, setSelectedGarageId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingGarages, setFetchingGarages] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchGarages();
  }, []);

  const fetchGarages = async () => {
    try {
      const response = await fetch('/api/garages');
      const data: ApiResponse<{ garages: Garage[] }> = await response.json();

      if (response.ok && data.success) {
        setGarages(data.data!.garages);
      } else {
        setError('Failed to load garages');
      }
    } catch (error) {
      console.error('Fetch garages error:', error);
      setError('Network error while loading garages');
    } finally {
      setFetchingGarages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!selectedGarageId) {
      setError('Please select a garage');
      setLoading(false);
      return;
    }

    try {
      const applicationData: MechanicApplicationData & { type: string } = {
        type: 'MECHANIC',
        garageId: parseInt(selectedGarageId),
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
        setSuccess('Mechanic application submitted successfully! You will be notified once it is reviewed.');
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

  if (fetchingGarages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading available garages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Apply as Mechanic
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join an automotive service garage
          </p>
        </div>

        {garages.length === 0 ? (
          <div className="text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-yellow-800">
                No approved garages available
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>There are currently no approved garages accepting mechanic applications.</p>
                <p className="mt-2">Please check back later or contact the system administrator.</p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/auth/signin"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="garage" className="block text-sm font-medium text-gray-700 mb-2">
                Select Garage *
              </label>
              <select
                id="garage"
                value={selectedGarageId}
                onChange={(e) => setSelectedGarageId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choose a garage...</option>
                {garages.map((garage) => (
                  <option key={garage.id} value={garage.id.toString()}>
                    {garage.garageName} (Admin: {garage.admin.firstName} {garage.admin.lastName})
                    {garage.rating > 0 && ` - Rating: ${garage.rating.toFixed(1)}`}
                  </option>
                ))}
              </select>
            </div>

            {selectedGarageId && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                {(() => {
                  const selectedGarage = garages.find(g => g.id.toString() === selectedGarageId);
                  return selectedGarage ? (
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">Selected Garage Details:</h4>
                      <div className="mt-2 text-sm text-blue-800">
                        <p><strong>Name:</strong> {selectedGarage.garageName}</p>
                        <p><strong>Admin:</strong> {selectedGarage.admin.firstName} {selectedGarage.admin.lastName}</p>
                        <p><strong>Contact:</strong> {selectedGarage.admin.email}</p>
                        {selectedGarage.rating > 0 && (
                          <p><strong>Rating:</strong> {selectedGarage.rating.toFixed(1)}/10</p>
                        )}
                        <p><strong>Status:</strong> <span className="text-green-600">Approved</span></p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Application Process:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Your application will be reviewed by the garage administrator</li>
                <li>• You will be notified via email once a decision is made</li>
                <li>• If approved, your account will be converted to a mechanic account</li>
                <li>• You will then have access to mechanic-specific features</li>
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
                disabled={loading || !selectedGarageId}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading || !selectedGarageId
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
                  <span className="text-gray-600">Want to register a garage instead? </span>
                  <Link
                    href="/auth/apply-garage"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Apply as Garage Owner
                  </Link>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}