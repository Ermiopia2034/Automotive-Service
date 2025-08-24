'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDateTime } from '@/utils/common';

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

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/payments?${params}`);
      const result = await response.json();

      if (result.success) {
        setPayments(result.data.payments);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

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

  const handleStatusUpdate = async (paymentId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchPayments(); // Refresh the list
      } else {
        setError(result.error || 'Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                  <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="all">All Payments</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Total: {payments.length} payments
                </div>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer & Garage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount & Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Payment #{payment.id}
                              </div>
                              <div className="text-sm text-gray-500">
                                {payment.transactionId}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDateTime(new Date(payment.createdAt))}
                              </div>
                              {payment.serviceRequest && (
                                <div className="text-sm text-blue-600">
                                  Service Request #{payment.serviceRequest.id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {payment.customer.firstName} {payment.customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{payment.customer.username}
                          </div>
                          <div className="text-sm font-medium text-gray-900 mt-1">
                            {payment.garage.garageName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${payment.amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getPaymentMethodLabel(payment.paymentMethod)}
                          </div>
                          {payment.paymentDate && (
                            <div className="text-sm text-gray-500">
                              Paid: {new Date(payment.paymentDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                          {payment.invoice && (
                            <div className="text-sm text-gray-500 mt-1">
                              Invoice: {payment.invoice.invoiceNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {payment.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(payment.id, 'COMPLETED')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Mark Complete
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(payment.id, 'FAILED')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Mark Failed
                                </button>
                              </>
                            )}
                            {payment.status === 'COMPLETED' && (
                              <button
                                onClick={() => handleStatusUpdate(payment.id, 'REFUNDED')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {payments.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                  <p className="mt-1 text-sm text-gray-500">No payments match the current filter.</p>
                </div>
              )}
            </div>
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
      </main>
    </div>
  );
}