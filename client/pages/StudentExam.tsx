import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, User, Search, X, Timer, Play, Pause, RotateCcw } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/use-toast";
import api from "@/lib/axios";

interface Student {
  _id: string;
  name: string;
  phone: string;
  step: number;
  totalBall: number;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Step {
  stepNumber: number;
  title: string;
  category: string;
  points: number;
  tests: Question[];
}

export default function StudentExam() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Timer states
  const [timerMinutes, setTimerMinutes] = useState<number>(10);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Fetch students
  const { data: students = [], isLoading: studentsLoading, error: studentsError } = useQuery<Student[]>({
    queryKey: ["students-mongo"],
    queryFn: async () => {
      try {
        const response = await api.get("/students-mongo");
        console.log('Students API response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Students API error:', error);
        throw error;
      }
    },
  });

  // Fetch steps data
  const { data: stepsData, isLoading: stepsLoading } = useQuery<{ steps: Step[] }>({
    queryKey: ["steps-data"],
    queryFn: async () => {
      const response = await fetch("/data/steps.json");
      return response.json();
    },
  });

  const steps = stepsData?.steps || [];
  const currentStep = steps.find(s => s.stepNumber === selectedStep);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            // Play sound when timer ends
            playTimerSound();
            toast({
              title: "Vaqt tugadi!",
              description: "Test vaqti tugadi",
              variant: "destructive",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft, toast]);

  // Timer functions
  const startTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(timerMinutes * 60);
    }
    setIsTimerRunning(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMinutes * 60);
  };

  const setTimerDuration = (minutes: number) => {
    setTimerMinutes(minutes);
    setTimeLeft(minutes * 60);
    setIsTimerRunning(false);
  };

  const playTimerSound = () => {
    // Create audio context and play beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Play 3 beeps
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 800;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.5);
    }, 600);
    
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 800;
      osc3.type = 'sine';
      gain3.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc3.start(audioContext.currentTime);
      osc3.stop(audioContext.currentTime + 0.5);
    }, 1200);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter students by search only (no branch or role filter)
  const filteredStudents = students.filter((s: any) => {
    const matchesSearch = !debouncedSearch || 
      s.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.phone?.includes(debouncedSearch);
    
    return matchesSearch;
  });

  console.log('StudentExam Debug:', {
    totalStudents: students.length,
    filteredStudents: filteredStudents.length,
    userRole: user?.role,
    userBranchId: user?.branch_id,
    searchQuery: debouncedSearch,
    sampleStudent: students[0]
  });

  const handleStepChange = (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > steps.length) return;
    setSelectedStep(stepNumber);
  };

  if (studentsLoading || stepsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <BookOpen className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">O'quvchi Tekshirish</h1>
          <p className="text-xs text-slate-500">Qadamlar bo'yicha test savollari</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Sidebar - Students & Steps */}
        <div className="lg:col-span-1 space-y-4">
          {/* Student Selection */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              O'quvchi tanlash
            </h3>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {studentsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Yuklanmoqda...</p>
                </div>
              ) : studentsError ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-red-600 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">Xatolik yuz berdi</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {(studentsError as any)?.message || 'API xatolik'}
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    {students.length === 0 
                      ? "O'quvchilar yo'q" 
                      : debouncedSearch 
                        ? "Qidiruv bo'yicha topilmadi"
                        : "O'quvchilar topilmadi"
                    }
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Jami o'quvchilar: {students.length}
                  </p>
                </div>
              ) : (
                filteredStudents.map((student: Student) => (
                  <button
                    key={student._id}
                    onClick={() => {
                      setSelectedStudent(student);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedStudent?._id === student._id
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'bg-slate-800/30 hover:bg-slate-800/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-white truncate">{student.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>Qadam: {student.step}</span>
                      <span>•</span>
                      <span>Ball: {student.totalBall}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Step Selection */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-white mb-3">Qadam tanlash</h3>
            <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
              {steps.map((step) => (
                <button
                  key={step.stepNumber}
                  onClick={() => handleStepChange(step.stepNumber)}
                  title={step.title}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStep === step.stepNumber
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  {step.stepNumber}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Timer & Questions */}
        <div className="lg:col-span-3 space-y-5">
          {/* Modern Timer Card */}
          <div className="card p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-slate-700/50">
            <div className="flex items-center justify-between">
              {/* Timer Display */}
              <div className="flex items-center gap-6">
                <div className={`relative w-32 h-32 rounded-2xl flex items-center justify-center ${
                  isTimerRunning 
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/30' 
                    : timeLeft > 0 
                      ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30'
                      : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/30'
                }`}>
                  <div className="text-center">
                    <Timer className={`w-8 h-8 mx-auto mb-2 ${
                      isTimerRunning ? 'text-green-400 animate-pulse' : 
                      timeLeft > 0 ? 'text-yellow-400' : 'text-cyan-400'
                    }`} />
                    <p className={`text-3xl font-bold ${
                      timeLeft === 0 ? 'text-white' : 
                      timeLeft < 60 ? 'text-red-400 animate-pulse' : 
                      isTimerRunning ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {timeLeft > 0 ? formatTime(timeLeft) : `${timerMinutes}:00`}
                    </p>
                  </div>
                  
                  {/* Progress Ring */}
                  {timeLeft > 0 && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className={isTimerRunning ? 'text-green-500/30' : 'text-yellow-500/30'}
                        strokeDasharray={`${(timeLeft / (timerMinutes * 60)) * 377} 377`}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Test Timer</h3>
                  <p className="text-sm text-slate-400 mb-3">
                    {isTimerRunning ? 'Ishlamoqda...' : timeLeft > 0 ? 'Pauza' : 'Tayyor'}
                  </p>
                  
                  {/* Timer Duration Selection */}
                  <div className="flex items-center gap-2">
                    {[5, 10, 15, 20, 25, 30].map((min) => (
                      <button
                        key={min}
                        onClick={() => setTimerDuration(min)}
                        disabled={isTimerRunning}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          timerMinutes === min
                            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                        } ${isTimerRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {min}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-3">
                {!isTimerRunning ? (
                  <button
                    onClick={startTimer}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50"
                  >
                    <Play className="w-5 h-5" />
                    <span>Boshlash</span>
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50"
                  >
                    <Pause className="w-5 h-5" />
                    <span>Pauza</span>
                  </button>
                )}
                
                <button
                  onClick={resetTimer}
                  className="flex items-center justify-center w-12 h-12 bg-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-all"
                  title="Qayta boshlash"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Timer Status Bar */}
            {timeLeft > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Qolgan vaqt</span>
                  <span>{Math.floor((timeLeft / (timerMinutes * 60)) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      timeLeft < 60 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      timeLeft < 180 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                    style={{ width: `${(timeLeft / (timerMinutes * 60)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Questions Content */}
          {!selectedStudent ? (
            <div className="card p-12 text-center">
              <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">O'quvchi tanlang</p>
            </div>
          ) : !currentStep ? (
            <div className="card p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Qadam tanlang</p>
            </div>
          ) : (
            /* Questions List - Simple view for mentor reference */
            <div className="card p-6">
              {/* Step Info */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">{currentStep.title}</h2>
                  <p className="text-sm text-slate-400">{currentStep.category} • {currentStep.points} ball</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Jami savollar</p>
                  <p className="text-lg font-bold text-cyan-400">{currentStep.tests.length}</p>
                </div>
              </div>

              {/* Questions List Only */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {currentStep.tests.map((question, index) => (
                  <div key={index} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <p className="text-white text-base leading-relaxed flex-1">{question.question}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
