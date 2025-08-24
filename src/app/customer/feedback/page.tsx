'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface Rating {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  garage: {
    id: number;
    garageName: string;
    latitude: number;
    longitude: number;
  };
  mechanic?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  } | null;
}

export default function CustomerFeedback() {
  const router = useRouter();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    totalWithComments: 0
  });

  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ratings?customerId=current&page=${page}&limit=10`);
      const result = await response.json();

      if (result.success) {
        setRatings(result.data.ratings);
        setTotalPages(result.data.totalPages);
        setStats({
          totalRatings: result.data.totalCount,
          averageRating: result.data.ratings.length > 0
            ? result.data.ratings.reduce((sum: number, r: Rating) => sum + r.rating, 0) / result.data.ratings.length
            : 0,
          totalWithComments: result.data.ratings.filter((r: Rating) => r.comment !== null).length
        });
      } else {
        setError(result.error || 'Failed to fetch ratings');
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setError('Failed to fetch ratings');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRatings();
  }, [page, fetchRatings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 8) return 'bg-green-100';
    if (rating >= 6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/customer')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
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
          {/* Stats Overview */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Review Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRatings}</div>
                <div className="text-sm text-gray-600">Total Reviews</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                </div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.totalWithComments}</div>
                <div className="text-sm text-gray-600">Reviews with Comments</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Reviews List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Your Reviews ({stats.totalRatings})
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading your reviews...</p>
                </div>
              ) : ratings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <p>You have not written any reviews yet.</p>
                  <p className="text-sm mt-1">Visit garages and share your experience!</p>
                  <button
                    onClick={() => router.push('/customer/garages')}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Find Garages to Review
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {ratings.map((rating) => (
                    <div
                      key={rating.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {rating.garage.garageName}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRatingBgColor(rating.rating)} ${getRatingColor(rating.rating)}`}>
                              {rating.rating}/10
                            </span>
                          </div>
                          {rating.mechanic && (
                            <p className="text-sm text-gray-600 mb-2">
                              Service by: {rating.mechanic.firstName} {rating.mechanic.lastName}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            {formatDate(rating.createdAt)}
                          </p>
                        </div>
                      </div>

                      {rating.comment && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-700 leading-relaxed">{rating.comment}</p>
                        </div>
                      )}

                      <div className="mt-3 flex justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/customer/garages?garage=${rating.garage.id}`)}
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          View Garage
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center space-x-2 mt-6">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-700">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}