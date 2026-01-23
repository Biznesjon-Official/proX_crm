import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Percent, User, TrendingUp, Search, CheckCircle, AlertCircle } from "lucide-react";
import { useBranchContext } from "../hooks/useBranchContext";
import { getAuthToken } from "../utils/auth";

interface StudentPercentageData {
  student_id: string;
  student_name: string;
  phone: string;
  branch_id: string;
  branch_name: string;
  total_ball: number;
  step: number;
  percentage: number;
  days_since_join: number;
  joinDate: string;
}

export default function StudentPercentage() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { selectedBranch } = useBranchContext();

  const { data: studentsWithPercentage = [], isLoading } = useQuery({
    queryKey: ["progress-students", selectedBranch?.id],
    queryFn: async () => {
      const token = getAuthToken();
      const url = selectedBranch?.id ? `/api/progress-mongo/students?branch_id=${selectedBranch.id}` : "/api/progress-mongo/students";
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  const filteredStudents = studentsWithPercentage.filter((student: any) => {
    const isStudentOffline = student.role === 'Student Offline';
    const matchesSearch = student.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    // Bloklangan o'quvchilarni ko'rsatmaslik
    const isNotBlocked = !student.is_blocked;
    return isStudentOffline && matchesSearch && isNotBlocked;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => b.percentage - a.percentage);
  const totalStudents = filteredStudents.length;
  const avgPercentage = totalStudents > 0 ? Math.round(filteredStudents.reduce((sum: number, s: StudentPercentageData) => sum + s.percentage, 0) / totalStudents) : 0;
  const activeStudents = filteredStudents.filter((s: StudentPercentageData) => s.percentage >= 100).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in-down">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Percent className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">O'quvchilar Foizi</h1>
          <p className="text-slate-500">Har bir o'quvchining o'quv foizi</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up">
        <div className="stat-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Jami</p>
            <p className="text-xl font-bold text-white">{totalStudents}</p>
          </div>
        </div>
        <div className="stat-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">O'rtacha</p>
            <p className="text-xl font-bold text-green-400">{avgPercentage}%</p>
          </div>
        </div>
        <div className="stat-card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Faol</p>
            <p className="text-xl font-bold text-emerald-400">{activeStudents}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-center animate-fade-in-up delay-100">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input placeholder="Qidirish..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-pro pl-11 w-full" />
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedStudents.map((student: StudentPercentageData, index: number) => {
          const isActive = student.percentage >= 100;
          return (
            <div key={student.student_id} className="card-pro p-4 cursor-pointer animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }} onClick={() => navigate(`/students/${student.student_id}`)}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${isActive ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-500/30' : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/20'}`}>
                  <span className="text-white font-bold text-lg">{student.student_name?.charAt(0)?.toUpperCase() || 'N'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">{student.student_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {isActive ? 'Faol' : 'Qarzdor'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{student.phone}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">Ball: <span className="text-cyan-400">{student.total_ball}</span></span>
                    <span className="text-xs text-slate-400">Qadam: <span className="text-purple-400">{student.step}</span></span>
                  </div>
                </div>
                <div className={`px-3 py-2 rounded-xl ${isActive ? 'bg-green-500/20' : 'bg-slate-800'}`}>
                  <span className={`text-xl font-bold ${isActive ? 'text-green-400' : 'text-white'}`}>{student.percentage}%</span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-3 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-slate-500 to-slate-400'}`} style={{ width: `${Math.min(student.percentage, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {sortedStudents.length === 0 && (
        <div className="text-center py-16 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-400 mb-2">O'quvchilar topilmadi</h3>
          <p className="text-slate-600">Qidiruv shartlariga mos o'quvchilar yo'q</p>
        </div>
      )}
    </div>
  );
}
