'use client';

import { useState, useEffect, useCallback } from 'react';
import RatingStars from './RatingStars';

interface RatingFormProps {
  garageId: number;
  garageName: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

interface Mechanic {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

export default function RatingForm({
  garageId,
  garageName,
  onSubmitSuccess,
  onCancel
}: RatingFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedMechanicId, setSelectedMechanicId] = useState<number | undefined>();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch mechanics for this garage
  const fetchMechanics = useCallback(async () => {
    try {
      const response = await fetch(`/api/garages/${garageId}/mechanics`);
      const result = await response.json();

      if (result.success) {
        setMechanics(result.data.mechanics || []);
      }
    } catch (error) {
      console.error('Error fetching mechanics:', error);
    }
  }, [garageId]);

  // Load mechanics when component mounts
  useEffect(() => {
    fetchMechanics();
  }, [garageId, fetchMechanics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.length > 500) {
      setError('Comment must be 500 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          garageId,
          mechanicId: selectedMechanicId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSubmitSuccess?.();
        }, 2000);
      } else {
        setError(result.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Rating submission error:', error);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Rating Submitted!</h3>
        <p className="text-gray-600">Thank you for your feedback. Your rating helps other customers make informed decisions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Rate Your Experience</h2>
        <p className="text-gray-600">How would you rate your experience with <strong>{garageName}</strong>?</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Rating (1-10) <span className="text-red-500">*</span>
          </label>
          <div className="flex justify-center">
            <RatingStars
              rating={rating}
              onRatingChange={setRating}
              size="lg"
              showNumber={true}
            />
          </div>
          {rating === 0 && (
            <p className="text-sm text-gray-500 mt-2 text-center">Click on the stars to rate</p>
          )}
        </div>

        {/* Mechanic Selection (Optional) */}
        {mechanics.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which mechanic served you? (Optional)
            </label>
            <select
              value={selectedMechanicId || ''}
              onChange={(e) => setSelectedMechanicId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Select a mechanic (optional)</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.firstName} {mechanic.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comment (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience... (max 500 characters)"
            rows={4}
            maxLength={500}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {comment.length}/500
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </form>
    </div>
  );
}