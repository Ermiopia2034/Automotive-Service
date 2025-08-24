'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface GarageAnalytics {
  overview: {
    totalMechanics: number;
    totalServices: number;
    totalRequests: number;
    totalRatings: number;
    averageRating: number;
    garageStatus: string;
  };
  mechanicMetrics: {
    activeMechanics: number;
    inactiveMechanics: number;
    averageCompletionRate: number;
    topPerformer: {
      name: string;
      completionRate: number;
    } | null;
    newMechanicsThisMonth: number;
  };
  serviceMetrics: {
    totalServiceRequests: number;
    pendingRequests: number;
    completedRequests: number;
    cancelledRequests: number;
    averageCompletionTime: number;
    requestsThisMonth: number;
    completionRateThisMonth: number;
  };
  performanceMetrics: {
    customerSatisfaction: number;
    responseTime: number;
    qualityScore: number;
    efficiency: number;
  };
  trends: {
    dailyRequests: Array<{
      date: string;
      requests: number;
      completions: number;
    }>;
    monthlyGrowth: {
      requests: number;
      mechanics: number;
      satisfaction: number;
    };
    ratingDistribution: {
      rating: number;
      count: number;
    }[];
  };
}

export default function GarageAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<GarageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState<'requests' | 'mechanics' | 'performance' | 'ratings'>('requests');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      params.append('scope', 'garage');
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

  const getPerformanceColor = (value: number, type: 'rating' | 'percentage') => {
    if (type === 'rating') {
      if (value >= 8) return 'text-green-600';
      if (value >= 6) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Approved</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Pending</span>;
      case 'removed':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Removed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">{status}</span>;
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Garage Analytics</h1>
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
              <p className="mt-4 text-gray-600">Loading garage analytics...</p>
            </div>
          ) : analytics ? (
            <>
              {/* Garage Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-400">
                  <div className="text-center">
                    <p className="text-blue-600 text-sm font-medium">Mechanics</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalMechanics}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-400">
                  <div className="text-center">
                    <p className="text-green-600 text-sm font-medium">Services</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalServices}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
                  <div className="text-center">
                    <p className="text-yellow-600 text-sm font-medium">Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalRequests}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
                  <div className="text-center">
                    <p className="text-purple-600 text-sm font-medium">Ratings</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalRatings}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-pink-400">
                  <div className="text-center">
                    <p className="text-pink-600 text-sm font-medium">Avg Rating</p>
                    <p className={`text-2xl font-bold ${getPerformanceColor(analytics.overview.averageRating, 'rating')}`}>
                      {analytics.overview.averageRating}/10
                    </p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-400">
                  <div className="text-center">
                    <p className="text-indigo-600 text-sm font-medium">Status</p>
                    <div className="mt-2">
                      {getStatusBadge(analytics.overview.garageStatus)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Selection Tabs */}
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex">
                    {(['requests', 'mechanics', 'performance', 'ratings'] as const).map((metric) => (
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
                            <p className="text-gray-600 text-sm">Completion Rate</p>
                            <p className={`text-2xl font-bold ${getPerformanceColor(analytics.serviceMetrics.completionRateThisMonth, 'percentage')}`}>
                              {analytics.serviceMetrics.completionRateThisMonth}%
                            </p>
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

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-md font-medium text-blue-900 mb-2">Monthly Growth</h4>
                        <div className="text-lg font-bold text-blue-700">
                          {getGrowthIcon(analytics.trends.monthlyGrowth.requests)} Requests
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMetric === 'mechanics' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Mechanic Analytics</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-green-600 text-sm">Active</p>
                            <p className="text-2xl font-bold text-green-800">{analytics.mechanicMetrics.activeMechanics}</p>
                          </div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-red-600 text-sm">Inactive</p>
                            <p className="text-2xl font-bold text-red-800">{analytics.mechanicMetrics.inactiveMechanics}</p>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-blue-600 text-sm">Avg Completion</p>
                            <p className={`text-2xl font-bold ${getPerformanceColor(analytics.mechanicMetrics.averageCompletionRate, 'percentage')}`}>
                              {analytics.mechanicMetrics.averageCompletionRate}%
                            </p>
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-purple-600 text-sm">New This Month</p>
                            <p className="text-2xl font-bold text-purple-800">{analytics.mechanicMetrics.newMechanicsThisMonth}</p>
                          </div>
                        </div>
                      </div>

                      {analytics.mechanicMetrics.topPerformer && (
                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-lg border-l-4 border-yellow-400">
                          <h4 className="text-lg font-semibold text-yellow-800 mb-2">🏆 Top Performer</h4>
                          <div className="flex justify-between items-center">
                            <span className="text-yellow-700 font-medium">
                              {analytics.mechanicMetrics.topPerformer.name}
                            </span>
                            <span className="text-2xl font-bold text-yellow-800">
                              {analytics.mechanicMetrics.topPerformer.completionRate}% ⭐
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-2">Growth Trends</h4>
                        <div className="text-lg font-bold text-gray-700">
                          {getGrowthIcon(analytics.trends.monthlyGrowth.mechanics)} Mechanics
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMetric === 'performance' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Customer Satisfaction</p>
                            <p className={`text-2xl font-bold ${getPerformanceColor(analytics.performanceMetrics.customerSatisfaction, 'percentage')}`}>
                              {analytics.performanceMetrics.customerSatisfaction}%
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Response Time</p>
                            <p className="text-2xl font-bold text-blue-600">{analytics.performanceMetrics.responseTime}h</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Quality Score</p>
                            <p className={`text-2xl font-bold ${getPerformanceColor(analytics.performanceMetrics.qualityScore, 'percentage')}`}>
                              {analytics.performanceMetrics.qualityScore}%
                            </p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-gray-600 text-sm">Efficiency</p>
                            <p className={`text-2xl font-bold ${getPerformanceColor(analytics.performanceMetrics.efficiency, 'percentage')}`}>
                              {analytics.performanceMetrics.efficiency}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 p-6 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Performance Overview</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Overall Performance</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analytics.performanceMetrics.customerSatisfaction}%` }}></div>
                              </div>
                              <span className={`font-medium ${getPerformanceColor(analytics.performanceMetrics.customerSatisfaction, 'percentage')}`}>
                                {analytics.performanceMetrics.customerSatisfaction}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Quality Metrics</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analytics.performanceMetrics.qualityScore}%` }}></div>
                              </div>
                              <span className={`font-medium ${getPerformanceColor(analytics.performanceMetrics.qualityScore, 'percentage')}`}>
                                {analytics.performanceMetrics.qualityScore}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Operational Efficiency</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${analytics.performanceMetrics.efficiency}%` }}></div>
                              </div>
                              <span className={`font-medium ${getPerformanceColor(analytics.performanceMetrics.efficiency, 'percentage')}`}>
                                {analytics.performanceMetrics.efficiency}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <h4 className="text-md font-medium text-indigo-900 mb-2">Satisfaction Trend</h4>
                        <div className="text-lg font-bold text-indigo-700">
                          {getGrowthIcon(analytics.trends.monthlyGrowth.satisfaction)} Customer Satisfaction
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMetric === 'ratings' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">Rating Distribution</h3>
                      
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-4">Rating Breakdown</h4>
                        <div className="space-y-3">
                          {analytics.trends.ratingDistribution.map((rating) => (
                            <div key={rating.rating} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700 w-8">
                                  {rating.rating}⭐
                                </span>
                                <div className="w-32 bg-gray-200 rounded-full h-3">
                                  <div
                                    className="bg-yellow-500 h-3 rounded-full"
                                    style={{
                                      width: `${(rating.count / Math.max(...analytics.trends.ratingDistribution.map(r => r.count))) * 100}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <span className="text-sm text-gray-600">{rating.count} reviews</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-green-600 text-sm">Excellent (9-10)</p>
                            <p className="text-2xl font-bold text-green-800">
                              {analytics.trends.ratingDistribution.filter(r => r.rating >= 9).reduce((sum, r) => sum + r.count, 0)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-yellow-600 text-sm">Good (7-8)</p>
                            <p className="text-2xl font-bold text-yellow-800">
                              {analytics.trends.ratingDistribution.filter(r => r.rating >= 7 && r.rating < 9).reduce((sum, r) => sum + r.count, 0)}
                            </p>
                          </div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="text-center">
                            <p className="text-red-600 text-sm">Poor (1-6)</p>
                            <p className="text-2xl font-bold text-red-800">
                              {analytics.trends.ratingDistribution.filter(r => r.rating < 7).reduce((sum, r) => sum + r.count, 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-6 rounded-lg text-center">
                        <h4 className="text-lg font-semibold text-blue-900 mb-2">Average Rating</h4>
                        <div className="text-4xl font-bold text-blue-700 mb-2">
                          {analytics.overview.averageRating}/10
                        </div>
                        <div className="text-blue-600">
                          Based on {analytics.overview.totalRatings} customer reviews
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No analytics data available for your garage.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}