import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  CheckCircle,
  AlertCircle,
  Star,
  Target,
  ArrowLeft,
  Download,
  Share2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { formatDate } from '../shared/utils';

export default function InterviewResultPage() {
  const { id: interviewId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!interviewId) {
      navigate('/dashboard/results');
      return;
    }

    fetchResult();
  }, [interviewId]);

  const fetchResult = async () => {
    try {
      const response = await axios.get(`/api/v1/interviews/${interviewId}`);
      setResult(response.data);
    } catch (error) {
      console.error('Failed to fetch result:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 rounded-xl bg-white shadow-lg text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-gray-900">Loading Results...</h3>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 rounded-xl bg-white shadow-lg text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-bold text-gray-900">Interview Not Found</h3>
          <p className="text-gray-500 mt-2">This interview result could not be loaded.</p>
          <button
            onClick={() => navigate('/dashboard/results')}
            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const feedback = result.feedback;
  const proctoring = result.proctoringData;

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const scoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const scoreIcon = (score: number) => {
    if (score >= 8) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 6) return <Minus className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/results')}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Results</h1>
            <p className="text-sm text-gray-500">
              {result.role?.replace('_', ' ')} • {result.level} • {formatDate(result.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Overall Score Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <p className="text-indigo-100 mb-2">Overall Performance</p>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="text-6xl font-bold">{feedback?.overallScore || 0}%</div>
              <div className="text-2xl opacity-90">{feedback?.overallScore && feedback.overallScore >= 70 ? '✓ Passed' : '✗ Needs Improvement'}</div>
            </div>
            <div className="mt-4 flex items-center justify-center md:justify-start gap-4 text-indigo-100">
              <span>Completed: {formatDate(result.completedAt || result.createdAt)}</span>
              <span>Duration: {result.durationSeconds ? `${Math.floor(result.durationSeconds / 60)}m ${result.durationSeconds % 60}s` : 'N/A'}</span>
            </div>
          </div>
          <div className="w-48 h-48 rounded-full border-4 border-white/30 flex items-center justify-center relative">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="90"
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 * (1 - (feedback?.overallScore || 0) / 100)}
                strokeLinecap="round"
                className="text-white"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Communication', key: 'communication', icon: <Star className="w-5 h-5" /> },
          { label: 'Technical Accuracy', key: 'technicalAccuracy', icon: <Target className="w-5 h-5" /> },
          { label: 'Problem Solving', key: 'problemSolving', icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Confidence', key: 'confidence', icon: <TrendingDown className="w-5 h-5" /> },
        ].map((cat) => (
          <div key={cat.key} className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              {cat.icon}
              <span className="font-medium">{cat.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${scoreColor(feedback?.[cat.key] || 0)}`}>
                {feedback?.[cat.key] || 0}
              </span>
              <span className="text-gray-400 mb-1">/10</span>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${scoreBgColor(feedback?.[cat.key] || 0)} rounded-full transition-all`}
                style={{ width: `${(feedback?.[cat.key] || 0) * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Proctoring Summary */}
      {proctoring && proctoring.events && proctoring.events.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Proctoring Summary
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 p-4 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{proctoring.warningsCount || 0}</p>
              <p className="text-sm text-gray-600">Warnings</p>
            </div>
            <div className="flex-1 p-4 bg-yellow-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">{proctoring.pointDeduction || 0}%</p>
              <p className="text-sm text-gray-600">Points Deducted</p>
            </div>
          </div>
          <div className="space-y-2">
            {proctoring.events.slice(0, 5).map((event: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  event.severity === 'critical' ? 'bg-red-50' : 'bg-yellow-50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  event.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{event.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()} • {event.type.replace('_', ' ')}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  event.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {event.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {feedback?.strengths?.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-green-500" />
            Strengths
          </h3>
          <div className="flex flex-wrap gap-2">
            {feedback.strengths.map((strength: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium"
              >
                {strength}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {feedback?.weaknesses?.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Areas for Improvement
          </h3>
          <div className="flex flex-wrap gap-2">
            {feedback.weaknesses.map((weakness: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium"
              >
                {weakness}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {feedback?.recommendations?.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            Recommendations
          </h3>
          <ul className="space-y-3">
            {feedback.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700">
                <span className="w-2 h-2 mt-2 rounded-full bg-indigo-500 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missed Concepts */}
      {feedback?.missedConcepts?.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Missed Concepts
          </h3>
          <div className="flex flex-wrap gap-2">
            {feedback.missedConcepts.map((concept: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Analysis */}
      {feedback?.detailedAnalysis && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
          <div className="prose prose-indigo max-w-none text-gray-700">
            {feedback.detailedAnalysis.split('\n').map((para: string, idx: number) => (
              <p key={idx} className="mb-4">{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center pt-4">
        <button
          onClick={() => navigate('/dashboard/practice')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          Practice Another Interview
        </button>
        <button
          onClick={() => navigate('/dashboard/results')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          View All Results
        </button>
      </div>
    </div>
  );
}