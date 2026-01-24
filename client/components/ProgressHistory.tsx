import { useQuery } from "@tanstack/react-query";
import { History, Award, Calendar, User, TrendingUp, Filter, X } from "lucide-react";
import { useState, useMemo } from "react";
import api from "@/lib/axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProgressHistoryProps {
  studentId: string;
  studentName: string;
}

interface ProgressRecord {
  _id: string;
  id: string;
  studentId: string;
  score: number;
  stepNumber?: number;
  stepTitle?: string;
  completedAt: string;
  createdAt: string;
  mentorName?: string;
  mentorUsername?: string;
}

export default function ProgressHistory({ studentId, studentName }: ProgressHistoryProps) {
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: progressHistory = [], isLoading } = useQuery<ProgressRecord[]>({
    queryKey: ["progress-history", studentId],
    queryFn: () => api.get(`/progress-mongo/student/${studentId}`).then(res => res.data),
    refetchInterval: 30000 // 30 sekund
  });

  // Filter by date
  const filteredHistory = useMemo(() => {
    let filtered = [...progressHistory];

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      if (dateFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(record => {
        const recordDate = new Date(record.completedAt || record.createdAt);
        return recordDate >= filterDate;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.stepTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.mentorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [progressHistory, dateFilter, searchTerm]);

  // Group by date
  const groupedHistory = useMemo(() => {
    const groups: Record<string, ProgressRecord[]> = {};
    
    filteredHistory.forEach(record => {
      const date = new Date(record.completedAt || record.createdAt);
      const dateKey = date.toLocaleDateString('uz-UZ', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
    });

    return groups;
  }, [filteredHistory]);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Hozirgina";
    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    if (diffDays === 1) return "Kecha";
    if (diffDays < 7) return `${diffDays} kun oldin`;
    
    return date.toLocaleDateString('uz-UZ', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalScore = useMemo(() => 
    filteredHistory.reduce((sum, record) => sum + (record.score || 0), 0),
    [filteredHistory]
  );

  const totalSteps = useMemo(() => 
    filteredHistory.reduce((sum, record) => sum + (record.stepNumber || 0), 0),
    [filteredHistory]
  );

  if (isLoading) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-cyan-400" />
          <h3 className="font-medium text-white">Progress Tarixi</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-700/50 rounded w-1/4 mb-2" />
              <div className="h-16 bg-slate-800/50 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h3 className="font-medium text-white">Progress Tarixi</h3>
          <span className="badge badge-cyan">{filteredHistory.length}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-500">Jami Ball</span>
          </div>
          <p className="text-lg font-bold text-purple-400">{totalScore}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-500">Jami Qadam</span>
          </div>
          <p className="text-lg font-bold text-green-400">{totalSteps}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="input w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="card border-slate-700">
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="today">Bugun</SelectItem>
            <SelectItem value="week">Bu hafta</SelectItem>
            <SelectItem value="month">Bu oy</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 pr-8 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History Timeline */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              {progressHistory.length === 0 
                ? "Hali progress tarixi yo'q" 
                : "Qidiruv natijasi topilmadi"}
            </p>
          </div>
        ) : (
          Object.entries(groupedHistory).map(([date, records]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">{date}</span>
                <div className="flex-1 h-px bg-slate-700/50" />
              </div>

              {/* Records */}
              <div className="space-y-2 ml-6">
                {records.map((record) => {
                  const time = new Date(record.completedAt || record.createdAt).toLocaleTimeString('uz-UZ', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={record._id || record.id}
                      className="relative pl-4 pb-3 border-l-2 border-slate-700/50 hover:border-cyan-500/50 transition-colors"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-cyan-500" />

                      <div className="bg-slate-800/30 rounded-lg p-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Main message */}
                            <p className="text-sm text-white mb-1">
                              <span className="font-medium text-cyan-400">{studentName}</span>
                              {record.score > 0 && (
                                <span className="text-slate-300">
                                  {" "}<span className="font-bold text-purple-400">{record.score}</span> ball oldi
                                </span>
                              )}
                              {record.stepNumber && (
                                <span className="text-slate-300">
                                  {" "}va <span className="font-bold text-green-400">{record.stepNumber}</span> qadamga o'tdi
                                </span>
                              )}
                            </p>

                            {/* Step title */}
                            {record.stepTitle && (
                              <p className="text-xs text-slate-500 mb-1">
                                📚 {record.stepTitle}
                              </p>
                            )}

                            {/* Mentor info */}
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              {record.mentorName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {record.mentorName}
                                </span>
                              )}
                              <span>{time}</span>
                              <span className="text-slate-600">•</span>
                              <span>{getTimeAgo(record.completedAt || record.createdAt)}</span>
                            </div>
                          </div>

                          {/* Score badge */}
                          {record.score > 0 && (
                            <div className="flex-shrink-0">
                              <div className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <span className="text-xs font-bold text-purple-400">
                                  +{record.score}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
