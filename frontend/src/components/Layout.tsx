import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Mic, Clock, BarChart2, Settings, LogOut, Menu, X, Calendar, Zap } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/schedule', label: 'Schedule Interview', icon: Calendar },
  { path: '/dashboard/practice', label: 'Practice Interview', icon: Mic },
  { path: '/dashboard/results', label: 'Results & Analysis', icon: BarChart2 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">VoiceInterview</h1>
                <p className="text-xs text-gray-500">AI Voice Interview Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-semibold text-gray-900">
                {navItems.find((i) => i.path === location.pathname)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm">
                <Zap className="w-4 h-4" />
                <span>{user?.credits || 0} credits</span>
              </div>
              <span className="hidden sm:block px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
                {user?.subscriptionTier || 'free'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}