'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation, formatDistance, formatRating, estimateTravelTime } from '@/utils/common';
import RatingDisplay from '@/components/RatingDisplay';
import RatingForm from '@/components/RatingForm';

interface Garage {
  id: number;
  garageName: string;
  latitude: number;
  longitude: number;
  rating: number;
  available: boolean;
  approved: boolean;
  createdAt: string;
  distance?: number;
  mechanicsCount: number;
  servicesCount: number;
  admin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  services: {
    service: {
      id: number;
      serviceName: string;
      estimatedPrice: number;
    };
    available: boolean;
  }[];
}

export default function CustomerGarages() {
  const router = useRouter();
  const [garages, setGarages] = useState<Garage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [maxDistance, setMaxDistance] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGarage, setSelectedGarage] = useState<Garage | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fetchGarages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      
      if (userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
      }
      
      if (maxDistance && maxDistance !== '') {
        params.append('max_distance', maxDistance);
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (sortBy !== 'default') {
        params.append('sort', sortBy);
      }

      if (minRating) {
        params.append('min_rating', minRating);
      }

      if (maxRating) {
        params.append('max_rating', maxRating);
      }

      const response = await fetch(`/api/garages?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setGarages(result.data.garages);
      } else {
        setError(result.error || 'Failed to fetch garages');
      }
    } catch (error) {
      console.error('Fetch garages error:', error);
      setError('Failed to fetch garages');
    } finally {
      setLoading(false);
    }
  }, [userLocation, maxDistance, searchTerm, sortBy, minRating, maxRating]);

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
      setLocationError('Unable to get your location. You can still browse all garages.');
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    fetchGarages();
  }, [userLocation, maxDistance, searchTerm, sortBy, minRating, maxRating, fetchGarages]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGarages();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setMaxDistance('');
    setSortBy('default');
    setMinRating('');
    setMaxRating('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/customer')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Find Garages</h1>
          </div>
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
          {/* Location Status */}
          {locationError && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded flex items-center justify-between">
              <span>{locationError}</span>
              <button
                onClick={getUserLocation}
                className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-3 py-1 rounded text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {userLocation && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              Location detected! Showing garages sorted by distance from your location.
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    placeholder="Search garages by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  />
                </form>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="default">Default</option>
                    {userLocation && <option value="distance">Distance</option>}
                    <option value="rating">Rating</option>
                    <option value="name">Name</option>
                  </select>
                </div>

                {userLocation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Distance (km)
                    </label>
                    <input
                      type="number"
                      placeholder="Any distance"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(e.target.value)}
                      min="1"
                      max="100"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Rating
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Any</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n}>{n}+ stars</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Rating
                  </label>
                  <select
                    value={maxRating}
                    onChange={(e) => setMaxRating(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Any</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <option key={n} value={n}>{n} stars max</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Garages List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Available Garages ({garages.length} found)
              </h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading garages...</p>
                </div>
              ) : garages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="mt-2">No garages found matching your criteria.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-green-600 hover:text-green-500"
                  >
                    Clear filters to see all garages
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {garages.map((garage) => (
                    <div
                      key={garage.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedGarage(garage)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {garage.garageName}
                        </h4>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            Rating: {formatRating(garage.rating)}
                          </div>
                          {garage.distance && (
                            <div className="text-sm text-green-600 font-medium">
                              {formatDistance(garage.distance)} away
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 mb-3">
                        Owner: {garage.admin.firstName} {garage.admin.lastName}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex space-x-4">
                          <span className="text-gray-600">
                            {garage.mechanicsCount} mechanics
                          </span>
                          <span className="text-gray-600">
                            {garage.servicesCount} services
                          </span>
                        </div>
                        {garage.distance && (
                          <span className="text-blue-600">
                            ~{estimateTravelTime(garage.distance)} drive
                          </span>
                        )}
                      </div>

                      {garage.services.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Available services:</div>
                          <div className="flex flex-wrap gap-2">
                            {garage.services.slice(0, 3).map((garageService) => (
                              <span
                                key={garageService.service.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                {garageService.service.serviceName}
                              </span>
                            ))}
                            {garage.services.length > 3 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{garage.services.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Garage Details Modal */}
          {selectedGarage && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedGarage.garageName}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedGarage(null);
                        setShowRatingForm(false);
                        setRatingSubmitted(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Rating:</span>
                        <span className="ml-2">{formatRating(selectedGarage.rating)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Mechanics:</span>
                        <span className="ml-2">{selectedGarage.mechanicsCount}</span>
                      </div>
                      {selectedGarage.distance && (
                        <>
                          <div>
                            <span className="font-medium text-gray-700">Distance:</span>
                            <span className="ml-2">{formatDistance(selectedGarage.distance)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Est. Travel:</span>
                            <span className="ml-2">{estimateTravelTime(selectedGarage.distance)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">Owner:</span>
                      <span className="ml-2">
                        {selectedGarage.admin.firstName} {selectedGarage.admin.lastName}
                      </span>
                    </div>

                    {selectedGarage.services.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Available Services:</h4>
                        <div className="space-y-2">
                          {selectedGarage.services.map((garageService) => (
                            <div
                              key={garageService.service.id}
                              className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                            >
                              <span className="font-medium text-gray-900">{garageService.service.serviceName}</span>
                              <span className="text-green-700 font-semibold">
                                ${garageService.service.estimatedPrice.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rating Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-semibold text-gray-900">Customer Reviews</h4>
                        {!showRatingForm && !ratingSubmitted && (
                          <button
                            onClick={() => setShowRatingForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium"
                          >
                            Write Review
                          </button>
                        )}
                      </div>

                      {showRatingForm ? (
                        <div className="mb-4">
                          <RatingForm
                            garageId={selectedGarage.id}
                            garageName={selectedGarage.garageName}
                            onSubmitSuccess={() => {
                              setRatingSubmitted(true);
                              setShowRatingForm(false);
                            }}
                            onCancel={() => setShowRatingForm(false)}
                          />
                        </div>
                      ) : (
                        <RatingDisplay garageId={selectedGarage.id} />
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Ready to request service from this garage?
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGarage(null);
                            setShowRatingForm(false);
                            setRatingSubmitted(false);
                            router.push(`/customer/request-service?garage_id=${selectedGarage.id}`);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                          Request Service
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}