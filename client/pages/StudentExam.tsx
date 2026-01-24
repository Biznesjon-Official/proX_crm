import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle, XCircle, Award, User, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "@/lib/axios";

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

interface Student {
  _id: string;
  name: string;
  phone: string;
  step: number;
  totalBall: number;
}

export default function StudentExam() {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);

  // Fetch students
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["students-mongo"],
    queryFn: () => api.get("/students-mongo").then(res => res.data),
  });

  // Fetch steps data
  const { data: stepsData } = useQuery<{ steps: Step[] }>({
    queryKey: ["steps-data"],
    queryFn: async () => {
      const response = await fetch("/data/steps.json");
      return response.json();
    },
  });

  const steps = stepsData?.steps || [];
  const currentStep = steps.find(s => s.stepNumber === selectedStep);
  const currentQuestion = currentStep?.tests[currentQuestionIndex];

  // Filter students by branch for mentor/manager
  const filteredStudents = students.filter((s: any) => {
    const isStudentOffline = s.role === 'Student Offline';
    if (user?.role === 'mentor' || user?.role === 'manager') {
      const sBranchId = typeof s.branch_id === 'object' ? s.branch_id?._id?.toString() : s.branch_id?.toString();
      return isStudentOffline && sBranchId === user?.branch_id;
    }
    return isStudentOffline;
  });

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;

    // Check if answer is correct
    const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;
    if (isCorrect) {
      setScore(score + 1);
    }

    // Mark question as answered
    setAnsweredQuestions([...answeredQuestions, currentQuestionIndex]);

    // Move to next question or show results
    if (currentQuestionIndex < (currentStep?.tests.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setShowResult(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleStepChange = (stepNumber: number) => {
    setSelectedStep(stepNumber);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions([]);
  };

  const resetExam = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions([]);
  };

  const percentage = currentStep ? Math.round((score / currentStep.tests.length) * 100) : 0;

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
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredStudents.map((student: Student) => (
                <button
                  key={student._id}
                  onClick={() => setSelectedStudent(student)}
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
              ))}
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

        {/* Main Content - Questions */}
        <div className="lg:col-span-3">
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
          ) : showResult ? (
            /* Results Screen */
            <div className="card p-8">
              <div className="text-center mb-6">
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  percentage >= 80 ? 'bg-green-500/20' : percentage >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}>
                  <Award className={`w-12 h-12 ${
                    percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Test yakunlandi!</h2>
                <p className="text-slate-400">{selectedStudent.name}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-cyan-400">{score}</p>
                  <p className="text-xs text-slate-500 mt-1">To'g'ri javoblar</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{currentStep.tests.length - score}</p>
                  <p className="text-xs text-slate-500 mt-1">Noto'g'ri javoblar</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-400">{percentage}%</p>
                  <p className="text-xs text-slate-500 mt-1">Natija</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={resetExam} className="flex-1 btn-secondary">
                  Qayta boshlash
                </button>
                <button onClick={() => handleStepChange(selectedStep + 1)} className="flex-1 btn-primary">
                  Keyingi qadam
                </button>
              </div>
            </div>
          ) : (
            /* Question Screen */
            <div className="card p-6">
              {/* Step Info */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">{currentStep.title}</h2>
                  <p className="text-sm text-slate-400">{currentStep.category} • {currentStep.points} ball</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Savol</p>
                  <p className="text-lg font-bold text-cyan-400">
                    {currentQuestionIndex + 1} / {currentStep.tests.length}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / currentStep.tests.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / currentStep.tests.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              {currentQuestion && (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-medium text-white mb-4">{currentQuestion.question}</h3>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          className={`w-full text-left p-4 rounded-lg transition-all ${
                            selectedAnswer === index
                              ? 'bg-cyan-500/20 border-2 border-cyan-500'
                              : 'bg-slate-800/30 border-2 border-slate-700/50 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedAnswer === index
                                ? 'border-cyan-500 bg-cyan-500'
                                : 'border-slate-600'
                            }`}>
                              {selectedAnswer === index && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <span className="text-white">{option}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <button
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Orqaga
                    </button>

                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>Javob tanlang</span>
                    </div>

                    <button
                      onClick={handleNextQuestion}
                      disabled={selectedAnswer === null}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentQuestionIndex === currentStep.tests.length - 1 ? 'Yakunlash' : 'Keyingi'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
