import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { User, Mail, Target, Award, Calendar, LogOut, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [companyTarget, setCompanyTarget] = useState(user?.companyTarget || '');
  const [defaultLevel, setDefaultLevel] = useState(user?.defaultLevel || 'medium');

  const companyOptions = [
    { value: '', label: 'No preference' },
    { value: 'google', label: 'Google' },
    { value: 'meta', label: 'Meta' },
    { value: 'amazon', label: 'Amazon' },
    { value: 'microsoft', label: 'Microsoft' },
    { value: 'apple', label: 'Apple' },
    { value: 'netflix', label: 'Netflix' },
    { value: 'uber', label: 'Uber' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
  ];

  const levelOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  const handleSave = async () => {
    try {
      const response = await axios.patch('/api/v1/user/profile', {
        name,
        companyTarget: companyTarget || undefined,
        defaultLevel,
      });

      if (response.data?.success) {
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
              {user.subscriptionTier} Plan
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold text-gray-900">{user.credits || 0}</p>
            <p className="text-sm text-gray-500">Credits</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Interviews</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-gray-900">0%</p>
            <p className="text-sm text-gray-500">Avg Score</p>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{user.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <p className="text-gray-900">{user.email}</p>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Company
            </label>
            {isEditing ? (
              <select
                value={companyTarget}
                onChange={(e) => setCompanyTarget(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                {companyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-900">{user.companyTarget || 'No preference'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Difficulty Level
            </label>
            {isEditing ? (
              <select
                value={defaultLevel}
                onChange={(e) => setDefaultLevel(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-900 capitalize">{user.defaultLevel}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Edit Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}