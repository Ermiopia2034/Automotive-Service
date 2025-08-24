'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDateTime } from '@/utils/common';

interface MechanicPerformance {
  id: number;
  userId: number;
  garageId: number;
  approved: boolean;
  removed: boolean;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phoneNumber: string | null;
  };
  garage: {
    id: number;
    garageName: string;
  };
  performance: {
    totalRequests: number;
    completedRequests: number;
    completionRate: number;
    averageRating: number;
    totalRatings: number;
    activeServices: number;
    avgCompletionTime: number;
    customerSatisfaction: number;
  };
  recentActivity: {
    lastActiveDate: string | null;
    recentRequests: number;
    recentCompletions: number;
  };
}


export default function MechanicManagementPage() {
  const router = useRouter();
  const [mechanics, setMechanics] = useState<MechanicPerformance[]>([]);
  const [stats, setStats] = useState({
    totalMechanics: 0,
    activeMechanics: 0,
    topPerformer: null as { name: string; completionRate: number } | null,
    averageCompletionRate: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter and sort states
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('completionRate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Selection states
  const [selectedMechanics, setSelectedMechanics] = useState<number[]>([]);
  const [showPerformanceDetail, setShowPerformanceDetail] = useState<MechanicPerformance | null>(null);

  const fetchMechanics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/admin/mechanic-performance?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setMechanics(result.data.mechanics);
        setStats(result.data.stats);
      } else {
        setError(result.error || 'Failed to fetch mechanic data');
      }
    } catch (error) {
      console.error('Fetch mechanics error:', error);
      setError('Failed to fetch mechanic data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchMechanics();
  }, [fetchMechanics]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMechanicSelection = (mechanicId: number, checked: boolean) => {
    if (checked) {
      setSelectedMechanics([...selectedMechanics, mechanicId]);
    } else {
      setSelectedMechanics(selectedMechanics.filter(id => id !== mechanicId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMechanics(mechanics.map(mechanic => mechanic.id));
    } else {
      setSelectedMechanics([]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedMechanics.length === 0) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/admin/mechanic-performance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mechanicIds: selectedMechanics,
          action
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setSelectedMechanics([]);
        await fetchMechanics();
      } else {
        setError(result.error || 'Failed to perform action');
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      setError('Failed to perform action');
    }
  };

  const getStatusBadge = (mechanic: MechanicPerformance) => {
    if (mechanic.removed) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Removed</span>;
    } else if (mechanic.approved) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const getPerformanceColor = (value: number, type: 'rate' | 'rating') => {
    if (type === 'rate') {
      if (value >= 90) return 'text-green-600';
      if (value >= 75) return 'text-blue-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 8) return 'text-green-600';
      if (value >= 6) return 'text-blue-600';
      if (value >= 4) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getPerformanceGrade = (completionRate: number, rating: number): string => {
    const avgScore = (completionRate + rating * 10) / 2;
    if (avgScore >= 90) return 'A+';
    if (avgScore >= 85) return 'A';
    if (avgScore >= 80) return 'B+';
    if (avgScore >= 75) return 'B';
    if (avgScore >= 70) return 'C+';
    if (avgScore >= 65) return 'C';
    return 'D';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/garage-admin"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Mechanic Performance & Management</h1>
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

          {/* Performance Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
              <div className="text-center">
                <p className="text-blue-600 text-sm font-medium">Total Mechanics</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMechanics}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
              <div className="text-center">
                <p className="text-green-600 text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeMechanics}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
              <div className="text-center">
                <p className="text-purple-600 text-sm font-medium">Avg Completion</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageCompletionRate}%</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
              <div className="text-center">
                <p className="text-yellow-600 text-sm font-medium">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageRating}/10</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-400">
              <div className="text-center">
                <p className="text-orange-600 text-sm font-medium">Top Performer</p>
                <p className="text-sm font-bold text-gray-900">
                  {stats.topPerformer ? stats.topPerformer.name : 'None'}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.topPerformer ? `${stats.topPerformer.completionRate}%` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white shadow rounded-lg mb-6 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Sorting</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Mechanics</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive/Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="completionRate">Completion Rate</option>
                  <option value="rating">Average Rating</option>
                  <option value="requests">Total Requests</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="desc">Highest First</option>
                  <option value="asc">Lowest First</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSortBy('completionRate');
                    setSortOrder('desc');
                  }}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMechanics.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    {selectedMechanics.length} mechanic(s) selected
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleBulkAction('suspend')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => handleBulkAction('remove')}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setSelectedMechanics([])}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mechanics Performance Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Mechanic Performance Dashboard ({mechanics.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading mechanic data...</p>
              </div>
            ) : mechanics.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No mechanics found. Approve mechanic applications to see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedMechanics.length === mechanics.length && mechanics.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mechanic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mechanics.map((mechanic) => (
                      <tr key={mechanic.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedMechanics.includes(mechanic.id)}
                            onChange={(e) => handleMechanicSelection(mechanic.id, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {mechanic.user.firstName} {mechanic.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{mechanic.user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {mechanic.user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(mechanic)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${
                              getPerformanceGrade(mechanic.performance.completionRate, mechanic.performance.averageRating).startsWith('A') 
                                ? 'text-green-600' 
                                : getPerformanceGrade(mechanic.performance.completionRate, mechanic.performance.averageRating).startsWith('B')
                                ? 'text-blue-600'
                                : getPerformanceGrade(mechanic.performance.completionRate, mechanic.performance.averageRating).startsWith('C')
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {getPerformanceGrade(mechanic.performance.completionRate, mechanic.performance.averageRating)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className={`text-sm font-medium ${getPerformanceColor(mechanic.performance.completionRate, 'rate')}`}>
                              {mechanic.performance.completionRate}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {mechanic.performance.completedRequests}/{mechanic.performance.totalRequests} requests
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className={`text-sm font-medium ${getPerformanceColor(mechanic.performance.averageRating, 'rating')}`}>
                              {mechanic.performance.averageRating}/10
                            </div>
                            <div className="text-xs text-gray-500">
                              {mechanic.performance.totalRatings} ratings
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>Active: {mechanic.performance.activeServices}</div>
                            <div>Recent: {mechanic.recentActivity.recentRequests}</div>
                            <div className="text-xs">
                              {mechanic.recentActivity.lastActiveDate 
                                ? `Last: ${formatDateTime(new Date(mechanic.recentActivity.lastActiveDate)).split(' ')[0]}`
                                : 'No recent activity'
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setShowPerformanceDetail(mechanic)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Performance Detail Modal */}
          {showPerformanceDetail && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Performance Review: {showPerformanceDetail.user.firstName} {showPerformanceDetail.user.lastName}
                    </h3>
                    <button
                      onClick={() => setShowPerformanceDetail(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Performance Metrics */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Performance Metrics</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Overall Grade:</span>
                          <span className={`font-bold ${
                            getPerformanceGrade(showPerformanceDetail.performance.completionRate, showPerformanceDetail.performance.averageRating).startsWith('A') 
                              ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {getPerformanceGrade(showPerformanceDetail.performance.completionRate, showPerformanceDetail.performance.averageRating)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completion Rate:</span>
                          <span className="font-medium">{showPerformanceDetail.performance.completionRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Rating:</span>
                          <span className="font-medium">{showPerformanceDetail.performance.averageRating}/10</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Customer Satisfaction:</span>
                          <span className="font-medium">{showPerformanceDetail.performance.customerSatisfaction}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Requests:</span>
                          <span className="font-medium">{showPerformanceDetail.performance.totalRequests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span className="font-medium">{showPerformanceDetail.performance.completedRequests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active Services:</span>
                          <span className="font-medium">{showPerformanceDetail.performance.activeServices}</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Recent Activity (30 days)</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Recent Requests:</span>
                          <span className="font-medium">{showPerformanceDetail.recentActivity.recentRequests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recent Completions:</span>
                          <span className="font-medium">{showPerformanceDetail.recentActivity.recentCompletions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Active:</span>
                          <span className="font-medium">
                            {showPerformanceDetail.recentActivity.lastActiveDate 
                              ? formatDateTime(new Date(showPerformanceDetail.recentActivity.lastActiveDate))
                              : 'No recent activity'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 mt-6">
                    {!showPerformanceDetail.approved && (
                      <button
                        onClick={() => {
                          handleBulkAction('approve');
                          setSelectedMechanics([showPerformanceDetail.id]);
                          setShowPerformanceDetail(null);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                      >
                        Approve Mechanic
                      </button>
                    )}
                    {showPerformanceDetail.approved && !showPerformanceDetail.removed && (
                      <button
                        onClick={() => {
                          handleBulkAction('suspend');
                          setSelectedMechanics([showPerformanceDetail.id]);
                          setShowPerformanceDetail(null);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm"
                      >
                        Suspend
                      </button>
                    )}
                    <button
                      onClick={() => setShowPerformanceDetail(null)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm"
                    >
                      Close
                    </button>
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