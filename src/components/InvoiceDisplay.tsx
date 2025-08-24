'use client';

import { useState, useEffect, useCallback } from 'react';

interface InvoiceDisplayProps {
  invoiceId: number;
  onClose?: () => void;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email?: string;
    phoneNumber?: string;
  };
  garage: {
    id: number;
    garageName: string;
    latitude: number;
    longitude: number;
  };
  serviceRequest?: {
    id: number;
    status: string;
    createdAt: string;
  };
  payment?: {
    id: number;
    amount: number;
    paymentMethod: string;
    status: string;
    transactionId: string;
    paymentDate: string;
  };
  invoiceItems: Array<{
    id: number;
    service?: {
      serviceName: string;
    };
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  issuedDate: string;
  dueDate?: string;
  paidDate?: string;
  status: string;
  notes?: string;
}

export default function InvoiceDisplay({ invoiceId, onClose }: InvoiceDisplayProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/invoices?invoiceId=${invoiceId}`);
      const result = await response.json();

      if (result.success) {
        setInvoice(result.data.invoice);
      } else {
        setError(result.error || 'Failed to fetch invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900">Invoice not found</h3>
        <p className="text-gray-600">The requested invoice could not be found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
            <p className="text-gray-600">#{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(invoice.status)}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Print
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* From/To */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">From</h3>
            <div className="text-gray-700">
              <p className="font-medium">{invoice.garage.garageName}</p>
              <p>Garage ID: #{invoice.garage.id}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">To</h3>
            <div className="text-gray-700">
              <p className="font-medium">{invoice.customer.firstName} {invoice.customer.lastName}</p>
              <p>Customer ID: #{invoice.customer.id}</p>
              {invoice.customer.email && <p>Email: {invoice.customer.email}</p>}
              {invoice.customer.phoneNumber && <p>Phone: {invoice.customer.phoneNumber}</p>}
            </div>
          </div>
        </div>

        {/* Service Request Info */}
        {invoice.serviceRequest && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Service Request</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Request ID: #{invoice.serviceRequest.id}</p>
              <p className="text-sm text-gray-600">Status: {invoice.serviceRequest.status}</p>
              <p className="text-sm text-gray-600">Date: {new Date(invoice.serviceRequest.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Invoice Items */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.invoiceItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.service?.serviceName || item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${item.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-900">${invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-gray-900">-${invoice.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">${invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {invoice.payment && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Payment Method:</span>
                  <span className="ml-2 text-gray-900">{invoice.payment.paymentMethod}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Transaction ID:</span>
                  <span className="ml-2 text-gray-900 font-mono">{invoice.payment.transactionId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Payment Date:</span>
                  <span className="ml-2 text-gray-900">{new Date(invoice.payment.paymentDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Amount Paid:</span>
                  <span className="ml-2 text-gray-900">${invoice.payment.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
          <p>Invoice issued on {new Date(invoice.issuedDate).toLocaleDateString()}</p>
          {invoice.dueDate && (
            <p>Due date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          )}
          {invoice.paidDate && (
            <p>Paid on: {new Date(invoice.paidDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}