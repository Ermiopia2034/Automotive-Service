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

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!paymentMethod) {
      errors.push('Please select a payment method');
    }
    
    if (amount <= 0) {
      errors.push('Invalid payment amount');
    }
    
    if (notes.length > 500) {
      errors.push('Notes cannot exceed 500 characters');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      // Focus on first error field
      if (!paymentMethod) {
        const firstRadio = document.querySelector('input[name="paymentMethod"]') as HTMLInputElement;
        firstRadio?.focus();
      }
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
        // Announce success to screen readers
        const successAnnouncement = document.createElement('div');
        successAnnouncement.setAttribute('aria-live', 'polite');
        successAnnouncement.setAttribute('aria-atomic', 'true');
        successAnnouncement.className = 'sr-only';
        successAnnouncement.textContent = 'Payment processed successfully!';
        document.body.appendChild(successAnnouncement);
        setTimeout(() => {
          document.body.removeChild(successAnnouncement);
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
      <div
        className="text-center py-8 px-4 sm:px-6"
        role="status"
        aria-live="polite"
      >
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 text-sm sm:text-base">
          Your payment has been processed successfully. You will receive a confirmation email shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Payment</h2>
          {description && (
            <p className="text-gray-600 mb-2 text-sm">{description}</p>
          )}
          {garage && (
            <p className="text-gray-600 text-sm">
              Paying to: <strong className="text-gray-900">{garage.garageName}</strong>
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start">
              <svg
                className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount
            </label>
            <div className="text-2xl sm:text-3xl font-bold text-green-600" aria-label={`Payment amount: ${amount.toFixed(2)} dollars`}>
              ${amount.toFixed(2)}
            </div>
          </div>

          {/* Payment Method Selection */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method <span className="text-red-500" aria-label="required">*</span>
            </legend>
            <div className="space-y-2" role="radiogroup" aria-required="true" aria-invalid={!paymentMethod && error ? 'true' : 'false'}>
              {[
                { value: 'CASH', label: 'Cash', description: 'Pay with cash at the garage', icon: '💵' },
                { value: 'CARD', label: 'Credit/Debit Card', description: 'Pay with card', icon: '💳' },
                { value: 'MOBILE_MONEY', label: 'Mobile Money', description: 'Pay with mobile money', icon: '📱' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer', description: 'Direct bank transfer', icon: '🏦' },
                { value: 'INSURANCE', label: 'Insurance', description: 'Covered by insurance', icon: '🛡️' }
              ].map((method) => (
                <label
                  key={method.value}
                  className={`
                    flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-150
                    hover:bg-gray-50 hover:border-gray-300 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500
                    ${paymentMethod === method.value ? 'border-green-500 bg-green-50' : 'border-gray-200'}
                  `}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setError(''); // Clear error when user makes a selection
                    }}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    aria-describedby={`payment-${method.value}-desc`}
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <span className="mr-2" aria-hidden="true">{method.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{method.label}</span>
                    </div>
                    <p className="text-sm text-gray-500" id={`payment-${method.value}-desc`}>
                      {method.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <label htmlFor="payment-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this payment..."
              rows={3}
              maxLength={500}
              className={`
                w-full border rounded-md shadow-sm px-3 py-2 text-sm
                focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors
                ${notes.length > 450 ? 'border-yellow-300' : 'border-gray-300'}
                ${notes.length === 500 ? 'border-red-300' : ''}
              `}
              aria-describedby="notes-help notes-count"
            />
            <div className="flex justify-between items-center mt-1">
              <p id="notes-help" className="text-xs text-gray-500">
                Optional additional information about this payment
              </p>
              <span
                id="notes-count"
                className={`text-xs ${notes.length > 450 ? 'text-yellow-600' : 'text-gray-500'} ${notes.length === 500 ? 'text-red-600 font-medium' : ''}`}
              >
                {notes.length}/500
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="
                  w-full sm:w-auto sm:flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white
                  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !paymentMethod}
              className="
                w-full sm:w-auto sm:flex-1 px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white
                hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors
                disabled:bg-gray-400 disabled:cursor-not-allowed
              "
              aria-describedby={loading ? 'processing-status' : undefined}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </button>
          </div>
          
          {loading && (
            <div id="processing-status" className="sr-only" aria-live="polite">
              Processing your payment, please wait...
            </div>
          )}
        </form>
      </div>
    </div>
  );
}