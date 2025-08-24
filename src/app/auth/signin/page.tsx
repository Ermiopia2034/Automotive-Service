'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserType } from '@/generated/prisma';

interface LoginFormData {
  username: string;
  password: string;
  userType: UserType;
}

export default function SignInPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    userType: UserType.CUSTOMER,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect based on user type
        const dashboards = {
          [UserType.SYSTEM_ADMIN]: '/system-admin',
          [UserType.GARAGE_ADMIN]: '/garage-admin',
          [UserType.MECHANIC]: '/mechanic',
          [UserType.CUSTOMER]: '/customer',
        };

        router.push(dashboards[formData.userType]);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Auto Service Management System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="userType" className="sr-only">
                User Type
              </label>
              <select
                id="userType"
                name="userType"
                required
                value={formData.userType}
                onChange={handleInputChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              >
                <option value={UserType.CUSTOMER}>Customer</option>
                <option value={UserType.MECHANIC}>Mechanic</option>
                <option value={UserType.GARAGE_ADMIN}>Garage Admin</option>
                <option value={UserType.SYSTEM_ADMIN}>System Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center space-y-4">
            <div className="text-sm">
              <Link
                href="/auth/forgot-password"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Forgot your password?
              </Link>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">
                Demo credentials:
              </p>
              <p className="text-xs text-gray-500 mt-2">
                System Admin - Username: admin, Password: admin123
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}