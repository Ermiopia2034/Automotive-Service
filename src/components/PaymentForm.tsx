'use client';

import { useState, useEffect, useCallback } from 'react';

interface PaymentFormProps {
  serviceRequestId?: number;
  garageId?: number;
  amount: number;
  description?: string;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

interface Garage {
  id: number;
  garageName: string;
}

export default function PaymentForm({
  serviceRequestId,
  garageId,
  amount,
  description,
  onSubmitSuccess,
  onCancel
}: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [garage, setGarage] = useState<Garage | null>(null);

  const fetchGarageDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/garages/${garageId}`);
      const result = await response.json();

      if (result.success) {
        setGarage(result.data.garage);
      }
    } catch (error) {
      console.error('Error fetching garage details:', error);
    }
  }, [garageId]);

  // Fetch garage details if garageId is provided
  useEffect(() => {
    if (garageId) {
      fetchGarageDetails();
    }
  }, [garageId, fetchGarageDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (amount <= 0) {
      setError('Invalid payment amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceRequestId,
          amount,
          paymentMethod,
          notes: notes.trim() || undefined,
          ...(garageId && !serviceRequestId && { garageId })
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSubmitSuccess?.();
        }, 2000);
      } else {
        setError(result.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setError('Failed to process payment. Please try again.');
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">Your payment has been processed successfully. You will receive a confirmation email shortly.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Payment</h2>
        {description && (
          <p className="text-gray-600 mb-2">{description}</p>
        )}
        {garage && (
          <p className="text-gray-600">Paying to: <strong>{garage.garageName}</strong></p>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount
          </label>
          <div className="text-2xl font-bold text-green-600">
            ${amount.toFixed(2)}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[
              { value: 'CASH', label: 'Cash', description: 'Pay with cash at the garage' },
              { value: 'CARD', label: 'Credit/Debit Card', description: 'Pay with card' },
              { value: 'MOBILE_MONEY', label: 'Mobile Money', description: 'Pay with mobile money' },
              { value: 'BANK_TRANSFER', label: 'Bank Transfer', description: 'Direct bank transfer' },
              { value: 'INSURANCE', label: 'Insurance', description: 'Covered by insurance' }
            ].map((method) => (
              <label key={method.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.value}
                  checked={paymentMethod === method.value}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">{method.label}</span>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for this payment..."
            rows={3}
            maxLength={500}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {notes.length}/500
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
            disabled={loading || !paymentMethod}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  );
}