import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle, Award, User, Clock, ChevronRight, ChevronLeft, Search, X, BarChart3 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/use-toast";
import api from "@/lib/axios";
import ConfirmDialog from "@/components/ConfirmDialog";

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

interface UserAnswer {
  questionIndex: number;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
}

export default function StudentExam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: number}>({});
  const [showResult, setShowResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showReviewAnswers, setShowReviewAnswers] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["students-mongo"],
    queryFn: () => api.get("/students-mongo").then(res => res.data),
  });

  // Fetch steps data
  const { data: stepsData, isLoading: stepsLoading } = useQuery<{ steps: Step[] }>({
    queryKey: ["steps-data"],
    queryFn: async () => {
      const response = await fetch("/data/steps.json");
      return response.json();
    },
  });

  // Fetch exam statistics
  const { data: examStats } = useQuery({
    queryKey: ["exam-stats"],
    queryFn: () => api.get("/exam-results/stats").then(res => res.data),
  });

  // Save exam result mutation
  const saveExamMutation = useMutation({
    mutationFn: (data: any) => api.post("/exam-results", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-stats"] });
      queryClient.invalidateQueries({ queryKey: ["students-mongo"] });
    },
  });

  // Give points mutation
  const givePointsMutation = useMutation({
    mutationFn: (data: any) => api.post("/progress-mongo", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-mongo"] });
    },
  });

  const steps = stepsData?.steps || [];
  const currentStep = steps.find(s => s.stepNumber === selectedStep);
  const currentQuestion = currentStep?.tests[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestionIndex];

  // Calculate score
  const score = Object.entries(userAnswers).filter(([index, answer]) => {
    const questionIndex = parseInt(index);
    const question = currentStep?.tests[questionIndex];
    return question && answer === question.correctAnswer;
  }).length;

  const percentage = currentStep ? Math.round((score / currentStep.tests.length) * 100) : 0;

  // Filter students by branch and search
  const filteredStudents = students.filter((s: any) => {
    const isStudentOffline = s.role === 'Student Offline';
    const matchesSearch = !debouncedSearch || 
      s.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.phone?.includes(debouncedSearch);
    
    if (user?.role === 'mentor' || user?.role === 'manager') {
      const sBranchId = typeof s.branch_id === 'object' ? s.branch_id?._id?.toString() : s.branch_id?.toString();
      return isStudentOffline && sBranchId === user?.branch_id && matchesSearch;
    }
    return isStudentOffline && matchesSearch;
  });

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answerIndex
    }));
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === undefined) return;

    // Move to next question or show results
    if (currentQuestionIndex < (currentStep?.tests.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeExam();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionJump = (index: number) => {
    if (!showResult) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleStepChange = (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > steps.length) return;
    setSelectedStep(stepNumber);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResult(false);
    setShowReviewAnswers(false);
  };

  const resetExam = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setShowResult(false);
    setShowReviewAnswers(false);
    setShowResetConfirm(false);
  };

  const completeExam = async () => {
    if (!selectedStudent || !currentStep) return;

    setShowResult(true);

    // Prepare answers data
    const answersData: UserAnswer[] = Object.entries(userAnswers).map(([index, answer]) => {
      const questionIndex = parseInt(index);
      const question = currentStep.tests[questionIndex];
      return {
        questionIndex,
        selectedAnswer: answer,
        correctAnswer: question.correctAnswer,
        isCorrect: answer === question.correctAnswer,
      };
    });

    // Save exam result to database
    try {
      await saveExamMutation.mutateAsync({
        studentId: selectedStudent._id,
        studentName: selectedStudent.name,
        stepNumber: selectedStep,
        stepTitle: currentStep.title,
        score,
        totalQuestions: currentStep.tests.length,
        percentage,
        answers: answersData,
        mentorId: user?.id,
        mentorName: user?.username,
      });

      // Give points to student
      const earnedPoints = Math.round((score / currentStep.tests.length) * currentStep.points);
      if (earnedPoints > 0) {
        await givePointsMutation.mutateAsync({
          student_id: selectedStudent._id,
          step_number: selectedStep,
          ball: earnedPoints,
          mentor_id: user?.id,
        });

        toast({
          title: "Tabriklaymiz!",
          description: `${selectedStudent.name} ${earnedPoints} ball oldi!`,
        });
      }
    } catch (error) {
      console.error("Save exam error:", error);
      toast({
        title: "Xatolik",
        description: "Natijani saqlashda xatolik",
        variant: "destructive",
      });
    }
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
      {/* Header with Statistics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">O'quvchi Tekshirish</h1>
            <p className="text-xs text-slate-500">Qadamlar bo'yicha test savollari</p>
          </div>
        </div>

        {/* Statistics */}
        {examStats && (
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-xs text-slate-500">Jami testlar</p>
                  <p className="text-sm font-bold text-white">{examStats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs text-slate-500">O'rtacha</p>
                <p className="text-sm font-bold text-green-400">{examStats.avgScore}%</p>
              </div>
            </div>
          </div>
        )}
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
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">O'quvchilar topilmadi</p>
                </div>
              ) : (
                filteredStudents.map((student: Student) => (
                  <button
                    key={student._id}
                    onClick={() => {
                      setSelectedStudent(student);
                      resetExam();
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

              {/* Review Answers */}
              <div className="mb-6">
                <button
                  onClick={() => setShowReviewAnswers(!showReviewAnswers)}
                  className="w-full btn-secondary"
                >
                  {showReviewAnswers ? 'Javoblarni yashirish' : 'Javoblarni ko\'rish'}
                </button>

                {showReviewAnswers && (
                  <div className="space-y-3 mt-4 max-h-96 overflow-y-auto">
                    {currentStep.tests.map((q, index) => {
                      const userAnswer = userAnswers[index];
                      const isCorrect = userAnswer === q.correctAnswer;
                      return (
                        <div key={index} className={`p-3 rounded-lg ${
                          isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                        }`}>
                          <div className="flex items-start gap-2 mb-2">
                            <span className={`text-xs font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                              {index + 1}.
                            </span>
                            <p className="text-sm text-white flex-1">{q.question}</p>
                          </div>
                          <div className="ml-5 space-y-1">
                            <p className="text-xs text-slate-400">
                              Sizning javobingiz: <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                                {q.options[userAnswer]}
                              </span>
                            </p>
                            {!isCorrect && (
                              <p className="text-xs text-slate-400">
                                To'g'ri javob: <span className="text-green-400">{q.options[q.correctAnswer]}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowResetConfirm(true)} 
                  className="flex-1 btn-secondary"
                >
                  Qayta boshlash
                </button>
                <button 
                  onClick={() => handleStepChange(selectedStep + 1)}
                  disabled={selectedStep >= steps.length}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedStep >= steps.length ? 'Oxirgi qadam' : 'Keyingi qadam'}
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

              {/* Question Numbers Grid */}
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2">Savollar:</p>
                <div className="grid grid-cols-10 gap-2">
                  {currentStep.tests.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionJump(index)}
                      className={`p-2 rounded text-xs font-medium transition-colors ${
                        index === currentQuestionIndex
                          ? 'bg-cyan-500 text-white'
                          : userAnswers[index] !== undefined
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Progress</span>
                  <span>{Object.keys(userAnswers).length} / {currentStep.tests.length} javob berildi</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${(Object.keys(userAnswers).length / currentStep.tests.length) * 100}%` }}
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
                      <span>{selectedAnswer !== undefined ? 'Javob tanlandi' : 'Javob tanlang'}</span>
                    </div>

                    <button
                      onClick={handleNextQuestion}
                      disabled={selectedAnswer === undefined}
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

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        onConfirm={resetExam}
        title="Testni qayta boshlash"
        description="Barcha javoblar o'chib ketadi. Davom etasizmi?"
        confirmText="Ha, qayta boshlash"
        cancelText="Yo'q"
        variant="warning"
        icon="warning"
      />
    </div>
  );
}
