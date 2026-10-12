import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AiAudioProcessorVisualizer from '../components/AiAudioProcessorVisualizer';
import {
  Mic,
  MicOff,
  Video,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Brain,
  Award,
  Zap,
  TrendingUp,
  Building2,
  FileText,
  MessageSquare,
  Volume2,
  Users,
  Code2,
  ChevronRight,
  Star,
  Check,
  Laptop,
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamic typing headline effect
  const roles = [
    'Software Engineers',
    'System Design Rounds',
    'Backend Developers',
    'Frontend & Fullstack',
    'AI & Data Scientists',
    'FAANG & Tier-1 Tech',
  ];
  const [roleIndex, setRoleIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Audio wave animation state for interactive hero preview
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'system_design' | 'companies' | 'behavioral'>('jobs');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Typing effect loop
  useEffect(() => {
    const currentFullText = roles[roleIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentFullText.substring(0, displayText.length + 1));
        if (displayText.length === currentFullText.length) {
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        setDisplayText(currentFullText.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setRoleIndex((prev) => (prev + 1) % roles.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, roleIndex]);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const handleStartPractice = (roleName?: string) => {
    if (user) {
      navigate('/dashboard/schedule');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1E2337] selection:bg-[#7250df]/20 selection:text-[#7250df] font-sans">
      {/* =========================================================================
          1. FLOATING PILL NAVBAR (Remasto-inspired)
         ========================================================================= */}
      <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none">
        <nav className="pointer-events-auto mx-auto max-w-6xl w-full rounded-full border border-white/80 bg-[#ebeef4]/90 px-4 sm:px-6 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md flex items-center justify-between transition-all">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#6347e3] to-[#8c52ff] flex items-center justify-center text-white shadow-md shadow-[#6347e3]/30 group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-gray-900 flex items-center gap-1.5">
                VoiceInterview <span className="text-[#6347e3]">AI</span>
              </span>
              <span className="text-[10px] text-gray-500 font-medium -mt-1 hidden sm:inline">
                Practice Studio
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1 text-sm font-semibold text-gray-700">
            <a
              href="#practice-studio"
              className="px-3.5 py-1.5 rounded-full hover:text-[#6347e3] hover:bg-white/60 transition-colors"
            >
              Practice Studio
            </a>
            <a
              href="#roles"
              className="px-3.5 py-1.5 rounded-full hover:text-[#6347e3] hover:bg-white/60 transition-colors"
            >
              Role Tracks
            </a>
            <a
              href="#companies"
              className="px-3.5 py-1.5 rounded-full hover:text-[#6347e3] hover:bg-white/60 transition-colors"
            >
              Company Rounds
            </a>
            <a
              href="#analytics-preview"
              className="px-3.5 py-1.5 rounded-full hover:text-[#6347e3] hover:bg-white/60 transition-colors"
            >
              Sample Analytics
            </a>
            <Link
              to="/pricing"
              className="px-3.5 py-1.5 rounded-full hover:text-[#6347e3] hover:bg-white/60 transition-colors"
            >
              Pricing
            </Link>
            <a
              href="#faqs"
              className="px-3.5 py-1.5 rounded-full hover:text-[#6347e3] hover:bg-white/60 transition-colors"
            >
              FAQs
            </a>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-[#6347e3] hover:bg-[#5235d6] text-white font-medium text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-full shadow-md shadow-[#6347e3]/25 transition-all flex items-center gap-1.5"
              >
                Go to Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-[#6347e3] hover:bg-[#5235d6] text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-full shadow-md shadow-[#6347e3]/25 hover:shadow-lg transition-all"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* =========================================================================
          2. HERO SECTION
         ========================================================================= */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
        {/* Subtle background glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-[#6347e3]/10 to-[#8c52ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Top Pill Announcement */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-2 bg-[#f0ecfc] border border-[#d8cff7] px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-[#6347e3] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#6347e3]" />
              <span>Real-Time Voice AI Practice Studio</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6347e3] animate-pulse" />
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center max-w-4xl mx-auto mb-6">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1E2337] leading-[1.15]">
              AI Practice Studio for <br />
              <span className="bg-gradient-to-r from-[#6347e3] via-[#8c52ff] to-[#4338ca] bg-clip-text text-transparent">
                {displayText}
                <span className="inline-block w-1 h-8 sm:h-12 bg-[#6347e3] ml-1 animate-pulse align-middle" />
              </span>
            </h1>
            <p className="mt-5 text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Practice real conversational voice interviews, master spontaneous follow-ups, and get instant structured feedback with speech analytics.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12">
            <button
              onClick={() => handleStartPractice()}
              className="bg-[#6347e3] hover:bg-[#5235d6] text-white font-semibold text-sm sm:text-base px-6 sm:px-8 py-3.5 rounded-full shadow-lg shadow-[#6347e3]/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              Start Free Practice
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#analytics-preview"
              className="bg-white/90 hover:bg-white text-gray-800 border border-gray-200 font-semibold text-sm sm:text-base px-6 py-3.5 rounded-full shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-[#6347e3]" />
              View Sample Analytics
            </a>
          </div>

          {/* =========================================================================
              PREMIUM AI AUDIO-PROCESSING VISUALIZATION (Live Dynamic Waveforms & Mic)
             ========================================================================= */}
          <div className="max-w-5xl mx-auto">
            <AiAudioProcessorVisualizer />
          </div>

          {/* Social Proof Brand Logos */}
          <div className="mt-14 pt-8 border-t border-gray-200/80 text-center">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500 mb-5">
              Practice Questions & Rubrics Modeled After Leading Employers
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-75 grayscale hover:grayscale-0 transition-all">
              {['Google', 'Meta', 'Amazon', 'Microsoft', 'Netflix', 'Apple', 'Stripe', 'Uber'].map((comp) => (
                <div
                  key={comp}
                  className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 shadow-sm"
                >
                  {comp}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. PRACTICE GOALS PREVIEW TABS ("Get ready for your next step")
         ========================================================================= */}
      <section id="practice-studio" className="py-16 sm:py-24 bg-white border-y border-gray-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6347e3]">Targeted Practice</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2337] mt-2 tracking-tight">
              Get ready for your <span className="text-[#6347e3]">next step.</span>
            </h2>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Choose your practice objective and train in a realistic voice environment.
            </p>
          </div>

          {/* Goal Selector Pill Tabs */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-full bg-[#f1edf8] border border-[#e1d8f3] max-w-full overflow-x-auto">
              {[
                { id: 'jobs', label: 'Jobs & Technical Skills' },
                { id: 'system_design', label: 'System Design & Arch' },
                { id: 'companies', label: 'Company-Specific Rounds' },
                { id: 'behavioral', label: 'Behavioral & Leadership' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#6347e3] text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Job Interviews */}
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-b from-[#f9f7fd] to-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#6347e3]/10 text-[#6347e3] flex items-center justify-center mb-4">
                  <Laptop className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">Job Interviews</h3>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Voice practice for your specific engineering role with realistic follow-up probes.
                </p>
                <div className="rounded-lg bg-white border border-gray-200/80 p-3 shadow-xs mb-3 text-xs">
                  <span className="font-semibold text-gray-800">Sample Prompt:</span>
                  <p className="text-gray-600 italic mt-1">“How do you optimize React re-renders with large state arrays?”</p>
                </div>
              </div>
              <button
                onClick={() => handleStartPractice('Software Engineer')}
                className="text-[#6347e3] font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all mt-3"
              >
                Start Practice <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Communication & Pacing */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-[#f5f9ff] to-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4">
                  <Volume2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">Voice Fluency</h3>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Real-time measurement of cadence, response latency, and reduction of filler words.
                </p>
                <div className="rounded-lg bg-white border border-blue-100 p-3 shadow-xs mb-3">
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                    <span>Speech Cadence</span>
                    <span className="text-blue-600">142 WPM</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full w-[85%]" />
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartPractice()}
                className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all mt-3"
              >
                Analyze Speech <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 3: Skill & Code Assessments */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-[#f4fcf7] to-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mb-4">
                  <Code2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">Skill Assessments</h3>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Validate domain accuracy on algorithms, system scalability, and database design.
                </p>
                <div className="rounded-lg bg-white border border-emerald-100 p-2.5 shadow-xs mb-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-gray-700 bg-emerald-50/70 px-2 py-1 rounded">
                    <span>Big-O Tradeoffs</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="flex items-center justify-between text-gray-700 bg-emerald-50/70 px-2 py-1 rounded">
                    <span>Idempotent APIs</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartPractice()}
                className="text-emerald-600 font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all mt-3"
              >
                Test Concepts <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 4: Company Rounds */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-b from-[#fffaf3] to-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-600 flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">Company Rounds</h3>
                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Targeted evaluations aligned with company leadership principles and bar raisers.
                </p>
                <div className="rounded-lg bg-white border border-amber-100 p-2.5 shadow-xs mb-3 text-xs flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">Google L4/L5</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">Amazon LPs</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">Meta E5</span>
                </div>
              </div>
              <button
                onClick={() => handleStartPractice()}
                className="text-amber-600 font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all mt-3"
              >
                Target Employer <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. 4-TIER JOB INTERVIEW STUDIO MATRIX
         ========================================================================= */}
      <section id="roles" className="py-16 sm:py-24 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6347e3]">Role Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2337] mt-2 tracking-tight">
              Job Interview <span className="text-[#6347e3]">Practice Studio</span>
            </h2>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Explore position-based, company-tailored, and custom practice tracks with structured post-interview analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Position-Based Interviews */}
            <div className="rounded-3xl border border-[#d8d5e9] bg-[#f4efef]/80 p-6 sm:p-8 hover:shadow-lg transition">
              <span className="inline-block rounded-full bg-[#e6e2f8] px-3.5 py-1 text-xs font-bold tracking-wide text-[#4b428b]">
                Role-Based Interviews
              </span>
              <h3 className="mt-4 text-xl sm:text-2xl font-extrabold text-[#252a3f]">Position-Based Interviews</h3>
              <p className="mt-2 text-sm text-[#545e74] leading-relaxed">
                Practice high-yield technical and behavioral questions across the most in-demand software engineering tracks.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {[
                  'Frontend Developer',
                  'Backend Developer',
                  'System Design',
                  'Data Structures',
                  'AI Engineer',
                  'Product Manager',
                ].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleStartPractice(role)}
                    className="rounded-full border border-gray-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:border-[#6347e3] transition shadow-xs"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Box 2: Target-Company Practice */}
            <div id="companies" className="rounded-3xl border border-[#d8d5e9] bg-[#f5eef8]/80 p-6 sm:p-8 hover:shadow-lg transition">
              <span className="inline-block rounded-full bg-[#e6e2f8] px-3.5 py-1 text-xs font-bold tracking-wide text-[#4b428b]">
                Company-Based Interviews
              </span>
              <h3 className="mt-4 text-xl sm:text-2xl font-extrabold text-[#252a3f]">Target-Company Practice</h3>
              <p className="mt-2 text-sm text-[#545e74] leading-relaxed">
                Train against hiring rubrics and interview styles modeled after leading tech employers.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {['Google', 'Meta', 'Amazon', 'Microsoft', 'Netflix', 'Stripe', 'Apple', 'Uber'].map((comp) => (
                  <button
                    key={comp}
                    onClick={() => handleStartPractice()}
                    className="rounded-full border border-gray-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:border-[#6347e3] transition shadow-xs"
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>

            {/* Box 3: Custom Interviews */}
            <div className="rounded-3xl border border-[#d8d5e9] bg-[#edf2fb]/80 p-6 sm:p-8 hover:shadow-lg transition">
              <span className="inline-block rounded-full bg-[#e6e2f8] px-3.5 py-1 text-xs font-bold tracking-wide text-[#4b428b]">
                Custom Interviews
              </span>
              <h3 className="mt-4 text-xl sm:text-2xl font-extrabold text-[#252a3f]">Personalized JD Experience</h3>
              <p className="mt-2 text-sm text-[#545e74] leading-relaxed">
                Generate dynamic interview simulations customized for a specific job posting, brief, or resume profile.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleStartPractice()}
                  className="rounded-full border border-gray-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:border-[#6347e3] transition shadow-xs"
                >
                  Job Description Based (JD)
                </button>
                <button
                  onClick={() => handleStartPractice()}
                  className="rounded-full border border-gray-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:border-[#6347e3] transition shadow-xs"
                >
                  Resume Tailored
                </button>
              </div>
            </div>

            {/* Box 4: Post-Interview Analytics */}
            <div className="rounded-3xl border border-[#d8d5e9] bg-[#edf8f5]/80 p-6 sm:p-8 hover:shadow-lg transition">
              <span className="inline-block rounded-full bg-[#e6e2f8] px-3.5 py-1 text-xs font-bold tracking-wide text-[#4b428b]">
                Post-Interview Analytics
              </span>
              <h3 className="mt-4 text-xl sm:text-2xl font-extrabold text-[#252a3f]">Comprehensive Feedback Reports</h3>
              <p className="mt-2 text-sm text-[#545e74] leading-relaxed">
                Receive structured evaluations across Domain Knowledge, Problem Solving, Articulation, and Proctoring integrity.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <a
                  href="#analytics-preview"
                  className="rounded-full border border-gray-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:border-[#6347e3] transition shadow-xs"
                >
                  Domain Knowledge
                </a>
                <a
                  href="#analytics-preview"
                  className="rounded-full border border-gray-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:border-[#6347e3] transition shadow-xs"
                >
                  Voice Articulation
                </a>
                <a
                  href="#analytics-preview"
                  className="rounded-full border border-gray-300 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white hover:border-[#6347e3] transition shadow-xs"
                >
                  Hiring Recommendation
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. REAL RESULTS & IMPACT STORY (Remasto-inspired)
         ========================================================================= */}
      <section className="py-16 sm:py-24 bg-white border-y border-gray-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6347e3]">Real Results</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2337] mt-2 tracking-tight">
              Practice that turns into <span className="text-[#6347e3]">progress.</span>
            </h2>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Consistent practice builds genuine fluency, reducing hesitation in high-stakes interviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Metric 1 */}
            <div className="rounded-3xl border border-gray-200/80 bg-gray-50/60 p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#6347e3] uppercase tracking-wider">Step 01</span>
                <div className="text-4xl sm:text-5xl font-black text-gray-900 my-4 tracking-tight">50+</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Real Practice Scenarios</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Covers frontend, backend, system architecture, algorithmic coding, and bar-raiser rounds.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#6347e3]">
                <CheckCircle2 className="w-4 h-4" /> Ready-to-practice tracks
              </div>
            </div>

            {/* Metric 2 */}
            <div className="rounded-3xl border border-gray-200/80 bg-gray-50/60 p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#6347e3] uppercase tracking-wider">Step 02</span>
                <div className="text-4xl sm:text-5xl font-black text-gray-900 my-4 tracking-tight">100K+</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Sessions Completed</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Every answer builds more conviction, sharpening your spontaneous technical articulation.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#6347e3]">
                <CheckCircle2 className="w-4 h-4" /> Zero risk mock practice
              </div>
            </div>

            {/* Metric 3 with SVG Progress Chart */}
            <div className="rounded-3xl border border-[#6347e3]/30 bg-gradient-to-br from-[#f8f5fe] to-white p-8 flex flex-col justify-between shadow-md">
              <div>
                <span className="text-xs font-bold text-[#6347e3] uppercase tracking-wider">Step 03</span>
                <div className="text-4xl sm:text-5xl font-black text-[#6347e3] my-4 tracking-tight">+38%</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Measured Score Boost</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Candidates improve from an average initial score of 62% to 88% by their 4th simulation.
                </p>

                {/* Progress Curve SVG */}
                <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-inner">
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                    <span>Initial: 62%</span>
                    <span className="text-[#6347e3]">Target: 88%</span>
                  </div>
                  <svg viewBox="0 0 240 60" className="w-full h-12 stroke-[#6347e3] fill-none">
                    <path
                      d="M 10 50 C 60 48, 100 35, 140 28 S 190 12, 230 10"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <circle cx="10" cy="50" r="4" className="fill-[#6347e3]" />
                    <circle cx="140" cy="28" r="4" className="fill-[#6347e3]" />
                    <circle cx="230" cy="10" r="5" className="fill-[#8c52ff]" />
                  </svg>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#6347e3]">
                <Award className="w-4 h-4" /> Verified career progression
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. INTERACTIVE SAMPLE SCORECARD & ANALYTICS PREVIEW
         ========================================================================= */}
      <section id="analytics-preview" className="py-16 sm:py-24 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6347e3]">Diagnostic Reporting</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2337] mt-2 tracking-tight">
              Sample Candidate <span className="text-[#6347e3]">Scorecard</span>
            </h2>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Here is the exact diagnostic report you receive after each completed voice session.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xl p-6 sm:p-10">
            {/* Header of Report */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900">System Design & Distributed Scalability</h3>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wide">
                    Strong Hire
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Conducted on VoiceInterview AI • Session ID: #int_9482b</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-gray-500 font-medium">Overall Score</span>
                  <div className="text-3xl font-black text-[#6347e3]">88 <span className="text-sm text-gray-400 font-normal">/ 100</span></div>
                </div>
              </div>
            </div>

            {/* Score Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
              {[
                { title: 'Technical Accuracy', score: '9.2 / 10', badge: 'Excellent', color: 'text-emerald-600' },
                { title: 'Problem Solving', score: '8.8 / 10', badge: 'Very Good', color: 'text-indigo-600' },
                { title: 'Communication', score: '9.0 / 10', badge: 'Articulate', color: 'text-purple-600' },
                { title: 'Confidence', score: '8.5 / 10', badge: 'Poised', color: 'text-blue-600' },
              ].map((cat, i) => (
                <div key={i} className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">{cat.title}</span>
                  <div className="text-xl font-bold text-gray-900 mt-1 mb-1">{cat.score}</div>
                  <span className={`text-[11px] font-bold ${cat.color}`}>{cat.badge}</span>
                </div>
              ))}
            </div>

            {/* Voice Telemetry Bar */}
            <div className="rounded-2xl bg-[#fbf9fe] border border-[#ece3fb] p-5 mb-8">
              <h4 className="font-bold text-sm text-[#4b428b] mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#6347e3]" />
                Voice Telemetry & Delivery Analysis
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Speaking Pace</span>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">138 WPM (Optimal)</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Recommended technical pace is 125–155 WPM</p>
                </div>
                <div>
                  <span className="text-gray-500">Filler Words Density</span>
                  <p className="font-bold text-emerald-600 text-sm mt-0.5">1.1% (Low)</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Natural hesitation without distracting fillers</p>
                </div>
                <div>
                  <span className="text-gray-500">Anti-Cheat Verification</span>
                  <p className="font-bold text-indigo-600 text-sm mt-0.5">100% Integrity</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Clean camera focus and single speaker verified</p>
                </div>
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
              <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-5">
                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths Demonstrated
                </h4>
                <ul className="space-y-2 text-emerald-800">
                  <li>• Clear breakdown of distributed database partitioning and CAP tradeoffs.</li>
                  <li>• Structured explanations following a top-down architectural approach.</li>
                  <li>• Proactively addressed idempotent retry handling for webhook delivery.</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5">
                <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Targeted Recommendations
                </h4>
                <ul className="space-y-2 text-amber-800">
                  <li>• Expand further on disaster recovery and multi-region data replication lag.</li>
                  <li>• Quantify cache hit ratio projections when introducing an in-memory layer.</li>
                  <li>• Mention circuit breaker patterns (e.g. Resilience4j) during failure recovery.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FAQS SECTION (Remasto-inspired Accordion)
         ========================================================================= */}
      <section id="faqs" className="py-16 sm:py-24 bg-white border-t border-gray-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6347e3]">Questions & Answers</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E2337] mt-2 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Everything you need to know about VoiceInterview AI.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'What is VoiceInterview AI?',
                a: 'VoiceInterview AI is an AI Practice Studio where you practice realistic conversational voice interviews with AI interviewer personas. You receive real-time dynamic questions, spoken follow-up probes, and comprehensive diagnostic feedback.',
              },
              {
                q: 'How does the voice interview work in the browser?',
                a: 'The platform utilizes WebRTC (powered by LiveKit) for ultra-low latency real-time voice streaming. The AI interviewer speaks directly to you through your audio output, and you respond naturally via your microphone without typing.',
              },
              {
                q: 'Does VoiceInterview AI ask dynamic follow-up questions?',
                a: 'Yes! The interview engine listens to your technical answers and formulates contextual follow-up probes in real time, challenging you on architectural trade-offs, Big-O complexities, and edge cases just like a human senior engineer.',
              },
              {
                q: 'Can I practice interviews for specific companies like Google or Amazon?',
                a: 'Absolutely. We provide company-targeted interview simulations modeled after employer hiring rubrics, such as Amazon Leadership Principles, Google scalable system design, and Meta fast execution rounds.',
              },
              {
                q: 'How does camera proctoring work?',
                a: 'We integrate on-device vision models (via MediaPipe) to track camera presence, eye gaze, and tab switching. This ensures anti-cheat integrity and gives employers confidence in your practice credentials.',
              },
              {
                q: 'Is VoiceInterview AI free to try?',
                a: 'Yes! Every new user receives free practice credits upon signup to experience full mock voice interview simulations before deciding to upgrade.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200/80 bg-[#FAFAF8] overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 text-left font-bold text-gray-900 text-sm sm:text-base flex items-center justify-between gap-4 hover:text-[#6347e3] transition"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      activeFaq === idx ? 'rotate-180 text-[#6347e3]' : ''
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. CALL TO ACTION BANNER
         ========================================================================= */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#1E2337] via-[#2A1E5C] to-[#1E2337] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Get Started Today</span>
          <h2 className="text-3xl sm:text-5xl font-black mt-3 tracking-tight leading-tight">
            Ready to crack your next technical interview?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-300 max-w-xl mx-auto">
            Build unshakeable confidence, master technical conversations, and land your dream offer.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => handleStartPractice()}
              className="bg-[#6347e3] hover:bg-[#5235d6] text-white font-bold text-sm sm:text-base px-8 py-4 rounded-full shadow-xl shadow-[#6347e3]/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              Start Free Practice Now
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/pricing"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base px-8 py-4 rounded-full backdrop-blur-md transition-all"
            >
              View Pricing Plans
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FOOTER
         ========================================================================= */}
      <footer className="bg-[#151928] text-gray-400 py-12 border-t border-gray-800 text-xs sm:text-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base mb-3">
              <Mic className="w-4 h-4 text-[#8c52ff]" />
              VoiceInterview AI
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              AI-driven voice mock interview studio with real-time WebRTC, adaptive follow-ups, and anti-cheat proctoring.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 text-xs uppercase tracking-wider">Practice Tracks</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">Frontend Developer</button></li>
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">Backend Developer</button></li>
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">System Design</button></li>
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">AI & ML Engineer</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 text-xs uppercase tracking-wider">Company Rounds</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">Google Interviews</button></li>
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">Amazon Leadership Principles</button></li>
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">Meta Engineering</button></li>
              <li><button onClick={() => handleStartPractice()} className="hover:text-white transition">Stripe Architecture</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3 text-xs uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/pricing" className="hover:text-white transition">Pricing Plans</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Sign In</Link></li>
              <li><Link to="/signup" className="hover:text-white transition">Create Account</Link></li>
              <li><a href="#faqs" className="hover:text-white transition">FAQs</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
          <p>© {new Date().getFullYear()} VoiceInterview AI Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-gray-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-gray-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-gray-300 cursor-pointer">Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
