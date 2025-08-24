'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SystemAnalytics {
  overview: {
    totalUsers: number;
    totalGarages: number;
    totalServices: number;
    totalRequests: number;
    totalRatings: number;
    systemUptime: string;
  };
  userMetrics: {
    customers: number;
    mechanics: number;
    garageAdmins: number;
    systemAdmins: number;
    newUsersThisMonth: number;
    activeUsers: number;
  };
  garageMetrics: {
    approvedGarages: number;
    pendingGarages: number;
    removedGarages: number;
    averageRating: number;
    topRatedGarage: {
      name: string;
      rating: number;
    } | null;
  };
  serviceMetrics: {
    totalServiceRequests: number;
    pendingRequests: number;
    completedRequests: number;
    cancelledRequests: number;
    averageCompletionTime: number;
    requestsThisMonth: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    systemLoad: number;
    errorRate: number;
    customerSatisfaction: number;
  };
  trends: {
    dailyRequests: Array<{
      date: string;
      requests: number;
      completions: number;
    }>;
    monthlyGrowth: {
      users: number;
      requests: number;
      garages: number;
    };
  };
}

export default function SystemAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState<'requests' | 'users' | 'garages' | 'performance'>('requests');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('scope', 'system');
      params.append('timeframe', timeframe);

      const response = await fetch(`/api/admin/analytics?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Fetch analytics error:', error);
      setError('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getHealthColor = (value: number, type: 'load' | 'error' | 'satisfaction') => {
    switch (type) {
      case 'load':
        if (value < 50) return 'text-green-600';
        if (value < 75) return 'text-yellow-600';
        return 'text-red-600';
      case 'error':
        if (value < 1) return 'text-green-600';
        if (value < 5) return 'text-yellow-600';
        return 'text-red-600';
      case 'satisfaction':
        if (value >= 80) return 'text-green-600';
        if (value >= 60) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <span className="text-green-600">↗ +{growth}%</span>;
    } else if (growth < 0) {
      return <span className="text-red-600">↘ {growth}%</span>;
    }
    return <span className="text-gray-600">→ 0%</span>;
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
            <h1 className="text-3xl font-bold text-gray-900">System Analytics</h1>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
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

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading system analytics...</p>
            </div>
          ) : analytics ? (
            <>
              {/* System Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
                  <div className="text-center">
                    <p className="text-blue-600 text-sm font-medium">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalUsers}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
                  <div className="text-center">
                    <p className="text-green-600 text-sm font-medium">Garages</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalGarages}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
                  <div className="text-center">
                    <p className="text-yellow-600 text-sm font-medium">Services</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalServices}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
                  <div className="text-center">
                    <p className="text-purple-600 text-sm font-medium">Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalRequests}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-pink-400">
                  <div className="text-center">
                    <p className="text-pink-600 text-sm font-medium">Ratings</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalRatings}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-400">
                  <div className="text-center">
                    <p className="text-indigo-600 text-sm font-medium">Uptime</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.systemUptime}</p>
                  </div>
                </div>
              </div>

              {/* Metric Selection Tabs */}
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex">
                    {(['requests', 'users', 'garages', 'performance'] as const).map((metric) => (
                      <button
                        key={metric}
                        onClick={() => setSelectedMetric(metric)}
                        className={`py-4 px-6 border-b-2 font-medium text-sm ${
                          selectedMetric === metric
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {metric.charAt(0).toUpperCase() + metric.slice(1)}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {selectedMetric === 'requests' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Service Request Analytics</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">{analytics.serviceMetrics.pendingRequests}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{analytics.serviceMetrics.completedRequests}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">This Month</p>
                            <p className="text-2xl font-bold text-blue-600">{analytics.serviceMetrics.requestsThisMonth}</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Avg Time (hrs)</p>
                            <p className="text-2xl font-bold text-purple-600">{analytics.serviceMetrics.averageCompletionTime}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Daily Request Trend</h4>
                        <div className="space-y-2">
                          {analytics.trends.dailyRequests.map((day) => (
                            <div key={day.date} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                              <div className="flex space-x-4">
                                <span className="text-blue-600">{day.requests} requests</span>
                                <span className="text-green-600">{day.completions} completed</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMetric === 'users' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">User Analytics</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-blue-600 text-sm">Customers</p>
                            <p className="text-2xl font-bold text-blue-800">{analytics.userMetrics.customers}</p>
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-green-600 text-sm">Mechanics</p>
                            <p className="text-2xl font-bold text-green-800">{analytics.userMetrics.mechanics}</p>
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-purple-600 text-sm">Garage Admins</p>
                            <p className="text-2xl font-bold text-purple-800">{analytics.userMetrics.garageAdmins}</p>
                          </div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-yellow-600 text-sm">New This Month</p>
                            <p className="text-2xl font-bold text-yellow-800">{analytics.userMetrics.newUsersThisMonth}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Growth Trends</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">User Growth</p>
                            <div className="text-lg font-bold">
                              {getGrowthIcon(analytics.trends.monthlyGrowth.users)}
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Request Growth</p>
                            <div className="text-lg font-bold">
                              {getGrowthIcon(analytics.trends.monthlyGrowth.requests)}
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Garage Growth</p>
                            <div className="text-lg font-bold">
                              {getGrowthIcon(analytics.trends.monthlyGrowth.garages)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMetric === 'garages' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Garage Analytics</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-green-600 text-sm">Approved</p>
                            <p className="text-2xl font-bold text-green-800">{analytics.garageMetrics.approvedGarages}</p>
                          </div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-yellow-600 text-sm">Pending</p>
                            <p className="text-2xl font-bold text-yellow-800">{analytics.garageMetrics.pendingGarages}</p>
                          </div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-red-600 text-sm">Removed</p>
                            <p className="text-2xl font-bold text-red-800">{analytics.garageMetrics.removedGarages}</p>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-blue-600 text-sm">Avg Rating</p>
                            <p className="text-2xl font-bold text-blue-800">{analytics.garageMetrics.averageRating}/10</p>
                          </div>
                        </div>
                      </div>

                      {analytics.garageMetrics.topRatedGarage && (
                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-lg border-l-4 border-yellow-400">
                          <h4 className="text-lg font-semibold text-yellow-800 mb-2">🏆 Top Rated Garage</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-yellow-700 font-medium">
                              {analytics.garageMetrics.topRatedGarage.name}
                            </span>
                            <span className="text-2xl font-bold text-yellow-800">
                              {analytics.garageMetrics.topRatedGarage.rating}/10 ⭐
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedMetric === 'performance' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">System Performance</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Response Time</p>
                            <p className="text-2xl font-bold text-green-600">{analytics.performanceMetrics.averageResponseTime}ms</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">System Load</p>
                            <p className={`text-2xl font-bold ${getHealthColor(analytics.performanceMetrics.systemLoad, 'load')}`}>
                              {analytics.performanceMetrics.systemLoad}%
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Error Rate</p>
                            <p className={`text-2xl font-bold ${getHealthColor(analytics.performanceMetrics.errorRate, 'error')}`}>
                              {analytics.performanceMetrics.errorRate}%
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Customer Satisfaction</p>
                            <p className={`text-2xl font-bold ${getHealthColor(analytics.performanceMetrics.customerSatisfaction, 'satisfaction')}`}>
                              {analytics.performanceMetrics.customerSatisfaction}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 p-6 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-4">System Health Status</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Overall System Health</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                              </div>
                              <span className="text-green-600 font-medium">95%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Database Performance</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                              </div>
                              <span className="text-yellow-600 font-medium">78%</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">API Response</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                              </div>
                              <span className="text-green-600 font-medium">92%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No analytics data available.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}