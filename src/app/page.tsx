import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">AutoService</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 animate-pulse"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-8">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Automotive Service
              </span>
              <br />
              <span className="text-gray-900">Management Platform</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Connect customers with trusted auto service centers. Streamline operations, manage appointments,
              and deliver exceptional service experiences.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/auth/register"
                className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                Join as Customer
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
              </Link>
              <Link
                href="/auth/signin"
                className="group bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                Sign In
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
              </Link>
            </div>

            {/* Business Application Buttons */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Join Our Business Network</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/apply-garage"
                  className="group bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                >
                  <span className="mr-2">🏪</span>
                  Register Garage
                  <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
                </Link>
                <Link
                  href="/auth/apply-mechanic"
                  className="group bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
                >
                  <span className="mr-2">🔧</span>
                  Join as Mechanic
                  <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-bounce"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Auto Service Excellence
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our comprehensive platform connects customers, mechanics, and service centers
              for seamless automotive service experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-white text-2xl">📍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Location-Based Discovery</h3>
              <p className="text-gray-600">
                Find nearby service centers with GPS integration, real-time distance calculations,
                and service availability filtering.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Real-Time Tracking</h3>
              <p className="text-gray-600">
                Track service progress in real-time with detailed status updates,
                estimated completion times, and progress notifications.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-white text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Secure Payments</h3>
              <p className="text-gray-600">
                Multiple payment options including cash, card, mobile money, and insurance
                with secure transaction processing and payment tracking.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-white text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Rating & Reviews</h3>
              <p className="text-gray-600">
                Interactive 1-10 star rating system with detailed reviews,
                customer feedback management, and performance analytics.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-white text-2xl">🔔</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Notifications</h3>
              <p className="text-gray-600">
                Real-time notifications for service updates, appointment reminders,
                payment confirmations, and important announcements.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-white text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Analytics Dashboard</h3>
              <p className="text-gray-600">
                Comprehensive analytics for performance tracking, business insights,
                customer satisfaction metrics, and growth analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Auto Service Experience?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of customers and service providers who trust our platform
            for reliable automotive services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Get Started Today
            </Link>
            <Link
              href="/auth/signin"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">AutoService</h3>
              <p className="text-gray-400 mb-4">
                Connecting customers with trusted automotive service centers through
                innovative technology and seamless experiences.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/auth/signin" className="text-gray-400 hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/auth/register" className="text-gray-400 hover:text-white transition-colors">Register</Link></li>
                <li><Link href="/auth/forgot-password" className="text-gray-400 hover:text-white transition-colors">Forgot Password</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Business</h4>
              <ul className="space-y-2">
                <li><Link href="/auth/apply-garage" className="text-gray-400 hover:text-white transition-colors">Register Garage</Link></li>
                <li><Link href="/auth/apply-mechanic" className="text-gray-400 hover:text-white transition-colors">Join as Mechanic</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AutoService Management Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
