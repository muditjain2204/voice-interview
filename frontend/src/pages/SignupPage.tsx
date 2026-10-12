import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Mic, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: 'software_engineer', label: 'Software Engineer' },
  { value: 'frontend_developer', label: 'Frontend Developer' },
  { value: 'backend_developer', label: 'Backend Developer' },
  { value: 'react_native_developer', label: 'React Native Developer' },
  { value: 'node_js_developer', label: 'Node.js Developer' },
  { value: 'data_structures_algorithms', label: 'Data Structures & Algorithms' },
  { value: 'system_design', label: 'System Design' },
  { value: 'hr_round', label: 'HR Round' },
  { value: 'ai_engineer', label: 'AI Engineer' },
  { value: 'data_analyst', label: 'Data Analyst' },
  { value: 'data_scientist', label: 'Data Scientist' },
  { value: 'product_manager', label: 'Product Manager' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'tax_analyst', label: 'Tax Analyst' },
  { value: 'forward_deploy_engineer', label: 'Forward Deploy Engineer' },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, googleLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('software_engineer');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error('Google sign up failed');
      return;
    }
    setIsLoading(true);
    try {
      await googleLogin(credentialResponse.credential, role);
      toast.success('Account created with Google successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Google sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signup(name, email, password, role);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
              <Mic className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Start practicing with AI-powered interviews
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                What role are you preparing for?
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Google Sign Up */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google sign up failed')}
                useOneTap
                theme="outline"
                size="large"
                shape="rectangular"
                width="100%"
                text="signup_with"
              />
            </div>

            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">or sign up with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}