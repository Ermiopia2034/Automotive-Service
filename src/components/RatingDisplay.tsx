'use client';

import { useState, useEffect, useCallback } from 'react';
import RatingStars from './RatingStars';

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
  };
  mechanic?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  } | null;
}

interface RatingDisplayProps {
  garageId: number;
}

export default function RatingDisplay({
  garageId
}: RatingDisplayProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ratings?garageId=${garageId}&page=${page}&limit=5`);
      const result = await response.json();

      if (result.success) {
        setRatings(result.data.ratings);
        setTotalPages(result.data.totalPages);
        setTotalRatings(result.data.totalCount);

        // Calculate average rating
        if (result.data.ratings.length > 0) {
          const avg = result.data.ratings.reduce((sum: number, r: Rating) => sum + r.rating, 0) / result.data.ratings.length;
          setAverageRating(Math.round(avg * 10) / 10);
        }
      } else {
        setError(result.error || 'Failed to fetch ratings');
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setError('Failed to fetch ratings');
    } finally {
      setLoading(false);
    }
  }, [garageId, page]);

  useEffect(() => {
    fetchRatings();
  }, [garageId, page, fetchRatings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Reviews</h3>

        {totalRatings > 0 ? (
          <div className="flex items-center space-x-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{averageRating}</div>
              <div className="text-sm text-gray-600">out of 10</div>
            </div>
            <div className="flex-1">
              <RatingStars rating={averageRating} readonly size="lg" />
              <div className="text-sm text-gray-600 mt-1">
                Based on {totalRatings} review{totalRatings !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p>No reviews yet</p>
            <p className="text-sm mt-1">Be the first to leave a review!</p>
          </div>
        )}
      </div>

      {/* Individual Reviews */}
      {ratings.length > 0 && (
        <div className="space-y-4">
          {ratings.map((rating) => (
            <div key={rating.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-800">
                      {rating.customer.firstName[0]}{rating.customer.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {rating.customer.firstName} {rating.customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(rating.createdAt)}
                    </div>
                  </div>
                </div>
                <RatingStars rating={rating.rating} readonly size="sm" />
              </div>

              {rating.mechanic && (
                <div className="text-sm text-gray-600 mb-2">
                  Service by: {rating.mechanic.firstName} {rating.mechanic.lastName}
                </div>
              )}

              {rating.comment && (
                <p className="text-gray-700 leading-relaxed">{rating.comment}</p>
              )}
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
  );
}