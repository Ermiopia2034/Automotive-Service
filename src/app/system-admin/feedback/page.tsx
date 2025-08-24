'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/utils/common';

interface Rating {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
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


export default function FeedbackManagementPage() {
  const router = useRouter();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    ratingDistribution: {} as { [key: number]: number },
    ratingsWithComments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter states
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [hasComment, setHasComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage] = useState(1);
  
  // Selection states
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ action: string; ratingIds: number[] } | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (minRating) params.append('minRating', minRating);
      if (maxRating) params.append('maxRating', maxRating);
      if (hasComment) params.append('hasComment', hasComment);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', '20');

      const response = await fetch(`/api/admin/ratings?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setRatings(result.data.ratings);
        setStats(result.data.stats);
      } else {
        setError(result.error || 'Failed to fetch ratings');
      }
    } catch (error) {
      console.error('Fetch ratings error:', error);
      setError('Failed to fetch ratings');
    } finally {
      setLoading(false);
    }
  }, [minRating, maxRating, hasComment, searchTerm, currentPage]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRatingSelection = (ratingId: number, checked: boolean) => {
    if (checked) {
      setSelectedRatings([...selectedRatings, ratingId]);
    } else {
      setSelectedRatings(selectedRatings.filter(id => id !== ratingId));
    }
  };


  const handleHideComments = async () => {
    if (selectedRatings.length === 0) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/ratings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ratingIds: selectedRatings,
          action: 'hideComment'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setSelectedRatings([]);
        await fetchRatings();
      } else {
        setError(result.error || 'Failed to hide comments');
      }
    } catch (error) {
      console.error('Hide comments error:', error);
      setError('Failed to hide comments');
    }
  };

  const handleDeleteRatings = async () => {
    if (!confirmAction || selectedRatings.length === 0 || !deleteReason.trim()) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/ratings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ratingIds: selectedRatings,
          reason: deleteReason.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setSelectedRatings([]);
        setConfirmAction(null);
        setDeleteReason('');
        await fetchRatings();
      } else {
        setError(result.error || 'Failed to delete ratings');
      }
    } catch (error) {
      console.error('Delete ratings error:', error);
      setError('Failed to delete ratings');
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 10 }, (_, i) => (
      <span key={i} className={`text-lg ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/system-admin"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">User Feedback & Ratings</h1>
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

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
              <div className="text-center">
                <p className="text-blue-600 text-sm font-medium">Total Ratings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRatings}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
              <div className="text-center">
                <p className="text-green-600 text-sm font-medium">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating}/10</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
              <div className="text-center">
                <p className="text-yellow-600 text-sm font-medium">With Comments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.ratingsWithComments}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
              <div className="text-center">
                <p className="text-purple-600 text-sm font-medium">Coverage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalRatings > 0 ? Math.round((stats.ratingsWithComments / stats.totalRatings) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rating Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.ratingDistribution)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([rating, count]) => (
                <div key={rating} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-500">{rating} Stars</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Rating</label>
                <select
                  value={maxRating}
                  onChange={(e) => setMaxRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                <select
                  value={hasComment}
                  onChange={(e) => setHasComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All</option>
                  <option value="true">With Comments</option>
                  <option value="false">No Comments</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search comments..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setMinRating('');
                    setMaxRating('');
                    setHasComment('');
                    setSearchTerm('');
                  }}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedRatings.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    {selectedRatings.length} rating(s) selected
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleHideComments}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Hide Comments
                  </button>
                  <button
                    onClick={() => setConfirmAction({ action: 'delete', ratingIds: selectedRatings })}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete Ratings
                  </button>
                  <button
                    onClick={() => setSelectedRatings([])}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {confirmAction && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Ratings</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Please provide a reason for deleting these {selectedRatings.length} rating(s):
                  </p>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Reason for deletion (required)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => {
                        setConfirmAction(null);
                        setDeleteReason('');
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteRatings}
                      disabled={!deleteReason.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-md text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ratings List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Ratings ({ratings.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading ratings...</p>
              </div>
            ) : ratings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No ratings found matching your criteria.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {ratings.map((rating) => (
                  <div key={rating.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedRatings.includes(rating.id)}
                          onChange={(e) => handleRatingSelection(rating.id, e.target.checked)}
                          className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`text-lg font-bold ${getRatingColor(rating.rating)}`}>
                              {rating.rating}/10
                            </span>
                            <div className="flex">{getRatingStars(rating.rating)}</div>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Customer:</strong> {rating.customer.firstName} {rating.customer.lastName} 
                            <span className="text-gray-500">(@{rating.customer.username})</span>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            <strong>Garage:</strong> {rating.garage.garageName}
                            {rating.mechanic && (
                              <span> • <strong>Mechanic:</strong> {rating.mechanic.firstName} {rating.mechanic.lastName}</span>
                            )}
                          </div>
                          
                          {rating.comment && (
                            <div className="bg-gray-50 p-3 rounded-lg mt-2">
                              <p className="text-sm text-gray-700">{rating.comment}</p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            {formatDateTime(new Date(rating.createdAt))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}