import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  AlertCircle,
  Loader2,
  Send,
  Volume2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMediaProctor } from '../hooks/useMediaProctor';

interface TranscriptItem {
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp?: string;
  isFollowUp?: boolean;
}

export default function InterviewPage() {
  const { user } = useAuth();
  const { id: interviewId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [candidateInput, setCandidateInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [proctoringWarnings, setProctoringWarnings] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Media proctoring hook
  const {
    videoRef,
    canvasRef,
    startProctoring,
    stopProctoring,
    warnings,
  } = useMediaProctor({
    onWarning: (event) => {
      setProctoringWarnings((prev) => prev + 1);
      if (event.severity === 'critical') {
        toast.error(`⚠️ ${event.description}`, { duration: 5000 });
      } else {
        toast.error(`⚠️ ${event.description}`, { duration: 3000 });
      }
    },
  });

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isSending]);

  // Proctoring warning limit
  useEffect(() => {
    if (warnings >= 5 && interviewId) {
      toast.error('Too many warnings. Interview terminated.');
      handleEndInterview();
    }
  }, [warnings]);

  // Load interview on mount
  useEffect(() => {
    if (!interviewId) {
      toast.error('Interview ID not found');
      navigate('/dashboard');
      return;
    }

    fetchInterview();
    startProctoring();

    return () => {
      stopProctoring();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [interviewId]);

  // Text-to-Speech function
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      setIsAiSpeaking(false);
    }
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Speech recognition error:', e.error);
        }
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setCandidateInput(currentTranscript);
        }
      };

      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  const fetchInterview = async () => {
    try {
      const response = await axios.get(`/api/v1/interviews/${interviewId}`);
      const data = response.data;
      setInterviewData(data);

      if (Array.isArray(data.transcript) && data.transcript.length > 0) {
        setTranscript(data.transcript);
        if (data.status === 'in_progress') {
          const lastInterviewerMsg = [...data.transcript]
            .reverse()
            .find((m: any) => m.role === 'interviewer');
          if (lastInterviewerMsg?.text) {
            speakText(lastInterviewerMsg.text);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch interview:', error);
      toast.error('Failed to load interview');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = candidateInput.trim();
    if (!textToSend || isSending || !interviewId) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setIsSending(true);
    setCandidateInput('');

    // Optimistically update UI
    const candidateMsg: TranscriptItem = {
      role: 'candidate',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };
    setTranscript((prev) => [...prev, candidateMsg]);

    try {
      const response = await axios.post('/api/v1/interviews/messages', {
        interviewId,
        text: textToSend,
      });

      const data = response.data;

      if (data.response) {
        const aiMsg: TranscriptItem = {
          role: 'interviewer',
          text: data.response,
          timestamp: new Date().toISOString(),
          isFollowUp: data.isFollowUp,
        };
        setTranscript((prev) => [...prev, aiMsg]);
        speakText(data.response);
      }

      if (data.interviewEnded) {
        toast.success('Interview completed!');
        if (data.feedback?.overallScore !== undefined) {
          setScore(data.feedback.overallScore);
        }
        setShowResult(true);
        stopProctoring();
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error.response?.data?.error || 'Failed to send response');
    } finally {
      setIsSending(false);
    }
  };

  const handleEndInterview = async () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      const response = await axios.post('/api/v1/interviews/end', { interviewId });
      const feedback = response.data?.feedback;
      if (feedback?.overallScore !== undefined) {
        setScore(feedback.overallScore);
      }
    } catch (error) {
      console.error('Failed to end interview:', error);
    } finally {
      setShowResult(true);
      stopProctoring();
    }
  };

  const handleContinue = () => {
    setShowResult(false);
    navigate(`/interview/result/${interviewId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-indigo-500" />
          <h3 className="text-xl font-bold text-white">Loading Interview...</h3>
          <p className="text-gray-400 mt-2">Connecting to AI interviewer...</p>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Volume2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Interview Completed</h3>
          <p className="text-gray-600 mb-6">Great job completing your session!</p>
          {score !== null && (
            <div className="mb-6">
              <div className="text-5xl font-extrabold text-indigo-600">{score}%</div>
              <p className="text-xs text-gray-500 mt-1">Overall AI Score</p>
            </div>
          )}
          <button
            onClick={handleContinue}
            className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
          >
            View Detailed Analysis
          </button>
        </div>
      </div>
    );
  }

  const latestInterviewerMsg = [...transcript]
    .reverse()
    .find((m) => m.role === 'interviewer')?.text ||
    "Hello! I am your AI interviewer. When you are ready, speak your response or type it below.";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col text-white">
      {/* Warning Banner */}
      {proctoringWarnings > 0 && (
        <div className="bg-red-500/95 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>
              {proctoringWarnings >= 3
                ? `Critical: ${proctoringWarnings} warnings detected — Keep your camera centered`
                : `Warning ${proctoringWarnings}/5: Please stay focused on the interview window`}
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: AI Interviewer & Live Conversation */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-900 via-indigo-950/40 to-gray-900 border-r border-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white capitalize">
                {interviewData?.role ? interviewData.role.replace(/_/g, ' ') : 'Technical'} Interview
              </h2>
              <p className="text-xs sm:text-sm text-indigo-300">
                Level: <span className="capitalize">{interviewData?.level || 'Medium'}</span>
                {interviewData?.company && ` • ${interviewData.company}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isAiSpeaking
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAiSpeaking ? 'bg-emerald-400' : 'bg-indigo-400'
                  }`}
                />
                {isAiSpeaking ? 'AI Speaking...' : 'AI Listening'}
              </span>
            </div>
          </div>

          {/* AI Avatar Stage */}
          <div className="py-4 text-center">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 mx-auto mb-3">
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ${
                  isAiSpeaking ? 'animate-pulse scale-105 opacity-80' : 'opacity-40'
                }`}
              />
              <div className="absolute inset-1.5 rounded-full bg-gray-900 flex items-center justify-center border border-indigo-500/40">
                <Volume2
                  className={`w-12 h-12 text-indigo-400 transition-transform ${
                    isAiSpeaking ? 'scale-110 animate-bounce' : ''
                  }`}
                />
              </div>
            </div>

            {/* Current Active Question Display */}
            <div className="max-w-2xl mx-auto bg-gray-900/90 border border-indigo-500/25 rounded-2xl p-4 shadow-xl backdrop-blur-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                Active Question / AI Prompt
              </span>
              <p className="text-sm sm:text-base text-gray-100 font-medium leading-relaxed">
                "{latestInterviewerMsg}"
              </p>
            </div>
          </div>

          {/* Live Transcript Thread */}
          <div className="flex-1 min-h-[160px] max-h-[320px] overflow-y-auto my-4 space-y-3 p-4 bg-gray-900/60 rounded-2xl border border-gray-800/80">
            {transcript.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.role === 'candidate' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-[10px] text-gray-400 mb-1 px-1">
                  {msg.role === 'candidate' ? 'You (Candidate)' : 'AI Interviewer'}
                </span>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm ${
                    msg.role === 'candidate'
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-gray-800 text-gray-200 border border-gray-700/60 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-xs text-indigo-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI is evaluating your response...</span>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Response Input Area */}
          <form onSubmit={handleSendMessage} className="mt-auto pt-2">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={candidateInput}
                onChange={(e) => setCandidateInput(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening to your speech...'
                    : 'Speak or type your answer here...'
                }
                disabled={isSending}
                className="flex-1 bg-gray-900/90 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />

              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  disabled={isSending || !isMicOn}
                  title={isListening ? 'Stop recording voice' : 'Start voice answer'}
                  className={`p-3 rounded-xl border transition-all ${
                    isListening
                      ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-indigo-300'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}

              <button
                type="submit"
                disabled={!candidateInput.trim() || isSending}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all shadow-md shadow-indigo-900/40"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 px-1">
              <span>Press Enter to submit your response</span>
              {isListening && <span className="text-red-400">● Mic active — speaking</span>}
            </div>
          </form>
        </div>

        {/* Right Side: Candidate Camera & Proctoring Panel */}
        <div className="lg:w-96 bg-gray-900 p-4 sm:p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-800">
          <div>
            <div className="relative w-full aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-800 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <canvas ref={canvasRef} className="absolute inset-0" />
              {!isVideoOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
                  <VideoOff className="w-10 h-10 mb-2" />
                  <span className="text-xs">Camera is muted</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                <p className="text-sm font-semibold text-white">{user?.name || 'Candidate'}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  AI Video Proctor Active
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
                Warnings: {proctoringWarnings}/5
              </span>
            </div>
          </div>

          {/* Call Controls */}
          <div className="pt-6 border-t border-gray-800">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                className={`p-3.5 rounded-full transition-colors ${
                  isMicOn
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsVideoOn(!isVideoOn)}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                className={`p-3.5 rounded-full transition-colors ${
                  isVideoOn
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleEndInterview}
                title="End Interview & Calculate Score"
                className="p-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40 transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}