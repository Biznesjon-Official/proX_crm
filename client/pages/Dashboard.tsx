import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Users, TrendingUp, Award, Target, Building2, Clock, RefreshCw } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "@/lib/axios";
import React from "react";

type UserRole = 'super_admin' | 'branch_manager' | 'head_teacher' | 'student';

export default function Dashboard() {
  const { user } = useAuth();
  
  if ((user?.role as UserRole) === 'student') {
    return <Navigate to="/student-profile" replace />;
  }
  
  const { data: students, isLoading: studentsLoading, refetch } = useQuery({
    queryKey: ['students-mongo'],
    queryFn: () => api.get('/students-mongo').then(res => res.data),
    refetchInterval: 30000
  });

  const { data: progressStats, isLoading: statsLoading } = useQuery({
    queryKey: ['progress', 'stats'],
    queryFn: () => api.get('/progress-mongo/stats').then(res => res.data),
    refetchInterval: 30000
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-mongo'],
    queryFn: () => api.get('/branches-mongo').then(res => res.data)
  });

  const totalStudents = students?.length || 0;
  const avgPercentage = progressStats?.avg_percentage ? Math.round(progressStats.avg_percentage) : 0;

  const growthPercentage = React.useMemo(() => {
    if (progressStats?.growth_percentage !== undefined) return progressStats.growth_percentage;
    if (!students || students.length === 0) return 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentStudents = students.filter((s: any) => {
      const dateStr = s.created_at || s.joinDate;
      if (!dateStr) return false;
      return new Date(dateStr) >= thirtyDaysAgo;
    });
    
    if (recentStudents.length === 0) return 0;
    const oldCount = totalStudents - recentStudents.length;
    if (oldCount === 0) return 100;
    return Math.round((recentStudents.length / oldCount) * 100);
  }, [students, totalStudents, progressStats?.growth_percentage]);

  const getTimeAgo = (date: string | Date | undefined) => {
    if (!date) return "Hech qachon";
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMinutes < 1) return "Hozirgina";
    if (diffMinutes < 60) return `${diffMinutes} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    return `${diffDays} kun oldin`;
  };

  const sortedBranches = [...branches].sort((a: any, b: any) => 
    new Date(b.last_login || 0).getTime() - new Date(a.last_login || 0).getTime()
  );

  const stats = [
    { label: "Jami O'quvchilar", value: totalStudents, change: `+${growthPercentage}%`, icon: Users, color: "cyan", loading: studentsLoading },
    { label: "O'rtacha Foiz", value: `${avgPercentage}%`, icon: TrendingUp, color: "green", loading: statsLoading },
    { label: "A'lo O'quvchilar", value: progressStats?.excellent_students || 0, sub: "80%+", icon: Award, color: "purple", loading: statsLoading },
    { label: "Jami Ball", value: (progressStats?.total_points || 0).toLocaleString(), icon: Target, color: "orange", loading: statsLoading },
  ];

  const colors: Record<string, string> = {
    cyan: "bg-cyan-500/10 text-cyan-400",
    green: "bg-green-500/10 text-green-400",
    purple: "bg-purple-500/10 text-purple-400",
    orange: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm">Tizim statistikasi</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Yangilash
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                {stat.loading ? (
                  <div className="h-8 w-16 skeleton rounded" />
                ) : (
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                )}
                {stat.change && <p className="text-xs text-green-400 mt-1">{stat.change}</p>}
                {stat.sub && <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>}
              </div>
              <div className={`p-2 rounded-lg ${colors[stat.color]}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Branches */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-cyan-400" />
          <h3 className="font-medium text-white">Filiallar Faolligi</h3>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sortedBranches.length > 0 ? sortedBranches.map((branch: any, i: number) => {
            const isOnline = branch.last_login && (Date.now() - new Date(branch.last_login).getTime()) < 1800000;
            return (
              <div key={branch._id || i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-600'}`} />
                  <div>
                    <p className="text-sm text-white">{branch.name}</p>
                    <p className="text-xs text-slate-500">{branch.district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span className={isOnline ? 'text-green-400' : ''}>{getTimeAgo(branch.last_login)}</span>
                </div>
              </div>
            );
          }) : (
            <p className="text-center text-slate-500 py-8">Filiallar topilmadi</p>
          )}
        </div>
      </div>
    </div>
  );
}
