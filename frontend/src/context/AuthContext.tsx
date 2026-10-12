import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// ============== Types ==============
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyTarget?: string;
  defaultLevel: string;
  credits: number;
  subscriptionTier: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  googleLogin: (credential: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============== Token Management ==============
const TOKEN_KEY = 'vi_auth_token';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    console.warn('Failed to store token in localStorage');
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    console.warn('Failed to clear token from localStorage');
  }
}

// ============== Axios Base URL Configuration ==============
const apiBaseUrl = import.meta.env.VITE_API_URL;
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl;
}

// ============== Axios Interceptor ==============
// Attach JWT token to every outgoing request
axios.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401/403 responses globally — auto-logout on invalid token
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't auto-logout on login/signup failures
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/signup')) {
        clearToken();
        // Optionally redirect — but don't do full page reload here
      }
    }
    return Promise.reject(error);
  }
);

// ============== Hook ==============
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============== Provider ==============
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    restoreAuth();
  }, []);

  const restoreAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Verify token by fetching current user
      const response = await axios.get('/api/v1/user/me');
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        clearToken();
        setUser(null);
      }
    } catch (error) {
      // Token is invalid or expired
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password });
      const { user: userData, token } = response.data;

      storeToken(token);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const signup = async (name: string, email: string, password: string, role: string) => {
    try {
      const response = await axios.post('/api/v1/auth/signup', { name, email, password, role });
      const { user: userData, token } = response.data;

      storeToken(token);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Signup failed');
    }
  };

  const googleLogin = async (credential: string, role?: string) => {
    try {
      const response = await axios.post('/api/v1/auth/google', { credential, role });
      const { user: userData, token } = response.data;

      storeToken(token);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Google sign in failed');
    }
  };

  const logout = () => {
    // Fire-and-forget server logout (JWT is stateless, this is optional)
    axios.post('/api/v1/auth/logout').catch(() => {});

    clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get('/api/v1/user/me');
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;