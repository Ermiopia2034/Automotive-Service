'use client';

import { useState, useEffect, useCallback } from 'react';

interface PaymentHistoryProps {
  garageId?: number;
  customerId?: number;
  limit?: number;
  onViewInvoice?: (invoiceId: number) => void;
}

interface Payment {
  id: number;
  amount: number;
  paymentMethod: string;
  status: string;
  transactionId: string;
  paymentDate: string;
  createdAt: string;
  notes?: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  garage: {
    id: number;
    garageName: string;
  };
  serviceRequest?: {
    id: number;
    status: string;
  };
  invoice?: {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  };
}

export default function PaymentHistory({
  garageId,
  customerId,
  limit = 10,
  onViewInvoice
}: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (garageId) {
        params.append('garageId', garageId.toString());
      }
      if (customerId) {
        params.append('customerId', customerId.toString());
      }

      const response = await fetch(`/api/payments?${params}`);
      const result = await response.json();

      if (result.success) {
        setPayments(result.data.payments);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || 'Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [garageId, customerId, page, limit]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Cash';
      case 'CARD':
        return 'Credit/Debit Card';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'INSURANCE':
        return 'Insurance';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
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

  if (payments.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
        <p className="mt-1 text-sm text-gray-500">No payment history available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
        <span className="text-sm text-gray-500">{payments.length} payments</span>
      </div>

      <div className="space-y-4">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-semibold text-gray-900">
                      ${payment.amount.toFixed(2)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Method:</span>
                    <span className="ml-2 text-gray-900">{getPaymentMethodLabel(payment.paymentMethod)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Transaction ID:</span>
                    <span className="ml-2 text-gray-900 font-mono text-xs">{payment.transactionId}</span>
                  </div>
                  {payment.serviceRequest && (
                    <div>
                      <span className="font-medium text-gray-700">Service Request:</span>
                      <span className="ml-2 text-gray-900">#{payment.serviceRequest.id}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">
                      {customerId ? 'Paid to:' : 'Customer:'}
                    </span>
                    <span className="ml-2 text-gray-900">
                      {customerId ? payment.garage.garageName : `${payment.customer.firstName} ${payment.customer.lastName}`}
                    </span>
                  </div>
                </div>

                {payment.notes && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Notes:</span>
                    <span className="ml-2">{payment.notes}</span>
                  </div>
                )}

                {payment.invoice && (
                  <div className="mt-2 flex items-center space-x-4 text-sm">
                    <span className="font-medium text-gray-700">Invoice:</span>
                    <span className="text-gray-900">#{payment.invoice.invoiceNumber}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${payment.invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {payment.invoice.status}
                    </span>
                    {onViewInvoice && (
                      <button
                        onClick={() => onViewInvoice(payment.invoice!.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        View Invoice
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}