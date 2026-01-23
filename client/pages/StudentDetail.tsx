import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Calendar, Award, Target, TrendingUp, Clock, CheckCircle, Lock } from "lucide-react";
import { getAuthToken } from "../utils/auth";
import api from "@/lib/axios";

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: studentInfo } = useQuery({
    queryKey: ["student-info", id],
    queryFn: async () => {
      const response = await api.get("/students-mongo");
      return response.data.find((s: any) => s.id === id || s._id === id);
    },
  });

  const { data: student, isLoading } = useQuery({
    queryKey: ["student-detail", id],
    queryFn: async () => {
      const token = getAuthToken();
      const progressResponse = await fetch(`/api/progress-mongo/students`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (progressResponse.ok) {
        const progressStudents = await progressResponse.json();
        const found = progressStudents.find((s: any) => s.student_id === id);
        if (found) return found;
      }
      
      const studentsResponse = await fetch(`/api/students-mongo`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!studentsResponse.ok) throw new Error("Failed to fetch student");
      const students = await studentsResponse.json();
      const studentData = students.find((s: any) => s.id === id || s._id === id);
      
      if (studentData) {
        const joinDate = new Date(studentData.joinDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - joinDate.getTime());
        const daysSinceJoin = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const percentage = daysSinceJoin > 0 ? Math.round((studentData.step * 100) / daysSinceJoin) : 0;
        
        return {
          student_id: studentData.id || studentData._id,
          student_name: studentData.name,
          phone: studentData.phone,
          total_ball: studentData.totalBall || 0,
          step: studentData.step || 0,
          percentage,
          days_since_join: daysSinceJoin,
          joinDate: studentData.joinDate
        };
      }
      return null;
    },
  });

  const { data: progressData = [] } = useQuery({
    queryKey: ["progress-mongo"],
    queryFn: () => api.get("/progress-mongo").then((res) => res.data),
  });

  const isBlocked = studentInfo?.is_blocked === true;

  const getTodaySteps = () => {
    if (!student || !progressData.length) return 0;
    const today = new Date().toISOString().split("T")[0];
    return progressData.filter((p: any) => {
      const progressDate = new Date(p.date).toISOString().split("T")[0];
      const isStudent = p.student_id === student.student_id || p.student_id === id;
      return isStudent && progressDate === today;
    }).reduce((sum: number, p: any) => sum + (p.step || 1), 0);
  };

  const getWeeklySteps = () => {
    if (!student || !progressData.length) return 0;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return progressData.filter((p: any) => {
      const progressDate = new Date(p.date);
      const isStudent = p.student_id === student.student_id || p.student_id === id;
      return isStudent && progressDate >= weekAgo;
    }).reduce((sum: number, p: any) => sum + (p.step || 1), 0);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 mb-4">O'quvchi topilmadi</p>
        <button onClick={() => navigate(-1)} className="btn-primary">Orqaga</button>
      </div>
    );
  }

  const dayDifference = student.step - student.days_since_join;
  const isAhead = dayDifference >= 0;
  const progressPercent = Math.min((student.step / 600) * 100, 100);
  const remainingSteps = Math.max(600 - student.step, 0);

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      {/* Blocked Overlay */}
      {isBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center p-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-red-400 mb-2">Bloklangan</h2>
            <p className="text-slate-400 text-sm mb-4">To'lov qilmagan</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate(-1)} className="btn-secondary">Orqaga</button>
              <button onClick={() => navigate('/payments')} className="btn-danger">To'lovlar</button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Orqaga</span>
      </button>

      {/* Hero */}
      <div className={`card p-5 ${isBlocked ? 'opacity-30' : ''}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="avatar-cyan w-16 h-16 text-2xl">{student.student_name?.charAt(0)?.toUpperCase() || 'N'}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-white">{student.student_name}</h1>
              <span className={`badge ${student.percentage >= 100 ? 'badge-green' : 'badge-yellow'}`}>
                {student.percentage >= 100 ? 'Faol' : 'Qarzdor'}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {student.phone}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {student.days_since_join} kun</span>
            </div>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-3xl font-bold text-cyan-400">{student.percentage}%</p>
            <p className="text-xs text-slate-500">foiz</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${isBlocked ? 'opacity-30' : ''}`}>
        <div className="card p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-green-400">{student.step}</p>
          <p className="text-xs text-slate-500">Bajarilgan</p>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-cyan-400">{getTodaySteps()}</p>
          <p className="text-xs text-slate-500">Bugun</p>
        </div>
        <div className="card p-4 text-center">
          <Target className="w-5 h-5 text-orange-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-orange-400">{remainingSteps}</p>
          <p className="text-xs text-slate-500">Qolgan</p>
        </div>
        <div className="card p-4 text-center">
          <Award className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <p className="text-xl font-bold text-purple-400">{student.total_ball}</p>
          <p className="text-xs text-slate-500">Ball</p>
        </div>
      </div>

      {/* Progress */}
      <div className={`card p-5 ${isBlocked ? 'opacity-30' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-white">O'quv Progressi</h2>
          <span className="text-lg font-bold text-cyan-400">{progressPercent.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mb-4">
          <span>0</span><span>150</span><span>300</span><span>450</span><span>600</span>
        </div>
        <div className={`p-3 rounded-lg ${isAhead ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <div className="flex items-center gap-3">
            {isAhead ? <TrendingUp className="w-5 h-5 text-green-400" /> : <Clock className="w-5 h-5 text-red-400" />}
            <div>
              <p className={`font-medium ${isAhead ? 'text-green-400' : 'text-red-400'}`}>
                {isAhead ? `${dayDifference} kun oldinda` : `${Math.abs(dayDifference)} kun orqada`}
              </p>
              <p className="text-xs text-slate-500">{isAhead ? "Ajoyib natija!" : "Tezroq harakat qiling!"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly */}
      <div className={`grid grid-cols-2 gap-3 ${isBlocked ? 'opacity-30' : ''}`}>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Haftalik</p>
          <p className="text-lg font-bold text-white">{getWeeklySteps()} qadam</p>
          <div className="h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((getWeeklySteps() / 7) * 100, 100)}%` }} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Kunlik o'rtacha</p>
          <p className="text-lg font-bold text-white">{(getWeeklySteps() / 7).toFixed(1)} qadam</p>
        </div>
      </div>
    </div>
  );
}
