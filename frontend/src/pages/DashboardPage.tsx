import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Calendar,
  Mic,
  BarChart2,
  Play,
  Clock,
  Users,
  Zap,
  ChevronRight,
  Star,
  CheckCircle,
} from 'lucide-react';

// Role and company options
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
];

const companyOptions = [
  { value: 'google', label: 'Google' },
  { value: 'meta', label: 'Meta' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'apple', label: 'Apple' },
  { value: 'netflix', label: 'Netflix' },
  { value: 'uber', label: 'Uber' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'databricks', label: 'Databricks' },
  { value: 'goldman_sachs', label: 'Goldman Sachs' },
];

type TabType = 'overview' | 'schedule' | 'practice' | 'results';
type LevelType = 'easy' | 'medium' | 'hard';

interface Interview {
  id: string;
  role: string;
  level: string;
  company?: string;
  status: string;
  overallScore?: number;
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
}

interface Stats {
  totalInterviews: number;
  completedInterviews: number;
  scheduledInterviews: number;
  averageScore: number;
}

export default function DashboardPage({ tab }: { tab?: TabType }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>(tab || 'overview');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalInterviews: 0,
    completedInterviews: 0,
    scheduledInterviews: 0,
    averageScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Schedule form state
  const [selectedRole, setSelectedRole] = useState('software_engineer');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LevelType>('medium');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Sync active tab when the route-driven prop changes
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [interviewsRes, statsRes] = await Promise.all([
        axios.get('/api/v1/user/interviews'),
        axios.get('/api/v1/user/stats'),
      ]);
      setInterviews(interviewsRes.data.interviews || []);
      setStats(statsRes.data.stats || stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartInterview = async (type: 'practice' | 'schedule') => {
    if (!user?.credits || user.credits < 1) {
      toast.error('Not enough credits. Please upgrade your plan.');
      navigate('/pricing');
      return;
    }

    try {
      const response = await axios.post('/api/v1/interviews/start', {
        role: selectedRole,
        company: selectedCompany || undefined,
        level: selectedLevel,
      });

      navigate(`/interview/${response.data.interviewId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start interview');
    }
  };

  const handleScheduleInterview = async () => {
    if (!scheduledDate) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      await axios.post('/api/v1/interviews/schedule', {
        role: selectedRole,
        company: selectedCompany || undefined,
        level: selectedLevel,
        scheduledAt: new Date(scheduledDate).toISOString(),
      });
      toast.success('Interview scheduled successfully!');
      fetchData();
      setActiveTab('results');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to schedule interview');
    }
  };

  const getRoleLabel = (role: string) => {
    return roleOptions.find((r) => r.value === role)?.label || role;
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      hard: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level as keyof typeof colors]}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      in_progress: 'bg-blue-100 text-blue-700',
      scheduled: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || ''}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'schedule', label: 'Schedule Interview', icon: Calendar },
            { id: 'practice', label: 'Practice Now', icon: Mic },
            { id: 'results', label: 'Results & Analysis', icon: BarChart2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Interviews</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalInterviews}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completedInterviews}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Scheduled</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.scheduledInterviews}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.averageScore}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Ready for your next interview?</h3>
                <p className="text-indigo-100">Practice with our AI interviewer and get detailed feedback.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Zap className="w-5 h-5" />
                  <span>{user?.credits || 0} credits</span>
                </div>
                <button
                  onClick={() => setActiveTab('practice')}
                  className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Practice
                </button>
              </div>
            </div>
          </div>

          {/* Recent Interviews */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Recent Interviews</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {interviews.slice(0, 5).map((interview) => (
                <div
                  key={interview.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/interview/result/${interview.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getRoleLabel(interview.role)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getLevelBadge(interview.level)}
                    {getStatusBadge(interview.status)}
                    {interview.overallScore && (
                      <span className="text-lg font-bold text-indigo-600">{interview.overallScore}%</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
              {interviews.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No interviews yet. Start practicing to see your history!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Tab */}
      {activeTab === 'schedule' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule an Interview</h2>

            <div className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Company (Optional)
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Any Company</option>
                  {companyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['easy', 'medium', 'hard'] as LevelType[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        selectedLevel === level
                          ? level === 'easy'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : level === 'medium'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date/Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleScheduleInterview}
                className="w-full py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practice Now Tab */}
      {activeTab === 'practice' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Interview</h2>
            <p className="text-gray-600 mb-6">Start a live voice interview with our AI interviewer.</p>

            <div className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['easy', 'medium', 'hard'] as LevelType[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        selectedLevel === level
                          ? level === 'easy'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : level === 'medium'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* What to expect */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="font-medium text-indigo-900 mb-2">What to expect:</h4>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• 10-15 minute voice interview</li>
                  <li>• Real-time AI interviewer with avatar</li>
                  <li>• Camera proctoring for cheating detection</li>
                  <li>• Detailed feedback and analysis after completion</li>
                </ul>
              </div>

              {/* Start Button */}
              <button
                onClick={() => handleStartInterview('practice')}
                className="w-full py-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Interview (1 credit)
              </button>

              <p className="text-center text-sm text-gray-500">
                You have {user?.credits || 0} credits available
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results & Analysis Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Interview History</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/interview/result/${interview.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getRoleLabel(interview.role)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(interview.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getLevelBadge(interview.level)}
                    {getStatusBadge(interview.status)}
                    {interview.overallScore !== undefined && interview.overallScore !== null && (
                      <span className="text-lg font-bold text-indigo-600">{interview.overallScore}%</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
              {interviews.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No interviews completed yet. Start practicing to see your results!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}