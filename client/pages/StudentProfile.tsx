import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, FileText, Crown, Sparkles, Zap, Calendar, Award, Building2, AlertTriangle, Lock, Phone } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "@/lib/axios";

type UserRole = 'super_admin' | 'student';

export default function StudentProfile() {
  const { user } = useAuth();

  // O'quvchi ma'lumotlarini olish
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: () => api.get(`/students-mongo/${user?.id}`).then(res => res.data),
    enabled: !!(user?.id && (user?.role as UserRole) === 'student')
  });

  // Progress ma'lumotlarini olish
  const { data: progressData = [], isLoading: progressLoading } = useQuery({
    queryKey: ['student-progress', user?.id],
    queryFn: () => api.get(`/progress-mongo/student/${user?.id}`).then(res => res.data).catch(() => []),
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30000
  });

  // Haqiqiy step sonini hisoblash
  const actualStep = progressData.length > 0 && progressData[0]?.step 
    ? progressData[0].step 
    : progressData.length;

  // Oxirgi progress
  const lastProgress = progressData[0] || null;

  // Qolgan vaqtni hisoblash
  const getRemainingTime = () => {
    if (!student?.blocked_at) return null;
    const blockedDate = new Date(student.blocked_at);
    const now = new Date();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - blockedDate.getTime();
    const remaining = oneYear - elapsed;
    
    if (remaining <= 0) return null;
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    return { days, hours, minutes };
  };

  if (studentLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-white">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-white">Ma'lumot topilmadi</div>
      </div>
    );
  }

  if (student.is_blocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Profil bloklangan</h2>
        <p className="text-slate-400 text-sm text-center max-w-sm">To'lov bo'yicha qarzdorlik sababli profilingiz bloklangan. Iltimos, manager bilan bog'laning.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Card */}
      <Card className="bg-gradient-to-br from-slate-800 via-slate-800/90 to-slate-900 border-2 border-slate-700">
        <CardContent className="p-6 space-y-6">
          {/* Header - Ism va Telefon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl">
                <span className="text-white font-bold text-3xl">
                  {student.name?.charAt(0)?.toUpperCase() || 'N'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{student.name}</h1>
                <p className="text-gray-400 flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4" />
                  {student.phone}
                </p>
              </div>
            </div>
            {/* Ogohlantirish tugmasi */}
            {(student.warnings?.length || 0) > 0 && (
              <Badge className="bg-orange-600 border-orange-500 text-white text-lg px-4 py-2">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Ogohlantirish
              </Badge>
            )}
          </div>

          {/* Qadam va Ball */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-6 text-center border border-green-500/30">
              <p className="text-sm text-green-300 mb-2 font-medium">Bajarilgan</p>
              <div className="flex items-center justify-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-400" />
                <p className="text-5xl font-bold text-green-400">{actualStep}</p>
              </div>
              <p className="text-sm text-green-500/70 mt-2">/ 600 qadam</p>
            </div>
            <div className="relative bg-gradient-to-br from-orange-900/40 to-orange-800/20 rounded-xl p-6 text-center border border-orange-500/30">
              <p className="text-sm text-orange-300 mb-2 font-medium">Qolgan</p>
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-orange-400" />
                <p className="text-5xl font-bold text-orange-400">{600 - actualStep}</p>
              </div>
              <p className="text-sm text-orange-500/70 mt-2">/ 600 qadam</p>
            </div>
          </div>

          {/* Tarif */}
          <div className="flex items-center justify-between py-4 border-t border-slate-600/50">
            <span className="text-gray-400 font-medium">Tarif:</span>
            {student.subscriptionPlan === 'VIP' ? (
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500 text-white text-lg px-4 py-2">
                <Crown className="w-5 h-5 mr-2" />
                VIP
              </Badge>
            ) : student.subscriptionPlan === 'Gold' ? (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-400 text-white text-lg px-4 py-2">
                <Sparkles className="w-5 h-5 mr-2" />
                Gold
              </Badge>
            ) : (
              <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-500 text-white text-lg px-4 py-2">
                <Zap className="w-5 h-5 mr-2" />
                Pro
              </Badge>
            )}
          </div>

          {/* Oxirgi Progress */}
          {lastProgress && (
            <div className="relative bg-gradient-to-br from-purple-900/50 via-pink-900/40 to-purple-900/50 rounded-xl p-6 border-2 border-purple-500/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg text-purple-200 font-semibold flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-400" />
                  Oxirgi Ball
                </span>
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  {lastProgress.score}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(lastProgress.date).toLocaleDateString('uz-UZ')}
                </span>
                {lastProgress.step && (
                  <span className="px-3 py-1 bg-purple-500/30 rounded-full text-purple-200 font-medium">
                    Qadam: {lastProgress.step}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Filial */}
          <div className="flex items-center justify-between py-4 border-t border-slate-600/50">
            <span className="text-gray-400 font-medium flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Filial:
            </span>
            <span className="text-cyan-400 font-semibold text-lg">
              {student.branch?.name || student.branch_name || 'Filialsiz'}
            </span>
          </div>

          {/* Ogohlantirishlar */}
          <div className="space-y-4 pt-4 border-t-2 border-slate-600/50">
            {/* Countdown Timer - faqat bloklangan bo'lsa */}
            {student.is_blocked && getRemainingTime() && (
              <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-2 border-purple-500/60 rounded-xl p-6">
                <p className="text-center text-purple-200 font-semibold mb-4">
                  ⏳ Profilingiz 1 yilga bloklangan. Avtomatik ochilishgacha:
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                    <p className="text-4xl font-bold text-purple-300">{getRemainingTime()?.days}</p>
                    <p className="text-sm text-purple-400 mt-1">Kun</p>
                  </div>
                  <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                    <p className="text-4xl font-bold text-purple-300">{getRemainingTime()?.hours}</p>
                    <p className="text-sm text-purple-400 mt-1">Soat</p>
                  </div>
                  <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                    <p className="text-4xl font-bold text-purple-300">{getRemainingTime()?.minutes}</p>
                    <p className="text-sm text-purple-400 mt-1">Daqiqa</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3ta ogohlantirish kartasi */}
            <div className="grid grid-cols-3 gap-3">
              {/* 1-Ogohlantirish */}
              <div className={`relative rounded-xl p-4 border-2 transition-all duration-300 ${
                (student.warnings?.length || 0) >= 1
                  ? 'bg-gradient-to-br from-orange-900/50 to-orange-800/30 border-orange-500/60'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-50'
              }`}>
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    (student.warnings?.length || 0) >= 1
                      ? 'bg-orange-500/20 border-2 border-orange-500/40'
                      : 'bg-slate-700/30 border-2 border-slate-600/30'
                  }`}>
                    {(student.warnings?.length || 0) >= 1 ? (
                      <AlertTriangle className="w-8 h-8 text-orange-400" />
                    ) : (
                      <Lock className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <span className={`text-sm font-bold ${
                    (student.warnings?.length || 0) >= 1 ? 'text-orange-300' : 'text-slate-500'
                  }`}>
                    1-Ogohlantirish
                  </span>
                </div>
              </div>

              {/* 2-Ogohlantirish */}
              <div className={`relative rounded-xl p-4 border-2 transition-all duration-300 ${
                (student.warnings?.length || 0) >= 2
                  ? 'bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-500/60'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-50'
              }`}>
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    (student.warnings?.length || 0) >= 2
                      ? 'bg-red-500/20 border-2 border-red-500/40'
                      : 'bg-slate-700/30 border-2 border-slate-600/30'
                  }`}>
                    {(student.warnings?.length || 0) >= 2 ? (
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    ) : (
                      <Lock className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <span className={`text-sm font-bold ${
                    (student.warnings?.length || 0) >= 2 ? 'text-red-300' : 'text-slate-500'
                  }`}>
                    2-Ogohlantirish
                  </span>
                </div>
              </div>

              {/* 3-Ogohlantirish */}
              <div className={`relative rounded-xl p-4 border-2 transition-all duration-300 ${
                (student.warnings?.length || 0) >= 3
                  ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/60'
                  : 'bg-slate-800/30 border-slate-600/30 opacity-50'
              }`}>
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    (student.warnings?.length || 0) >= 3
                      ? 'bg-purple-500/20 border-2 border-purple-500/40'
                      : 'bg-slate-700/30 border-2 border-slate-600/30'
                  }`}>
                    <Lock className="w-8 h-8 text-purple-400" />
                  </div>
                  <span className={`text-sm font-bold ${
                    (student.warnings?.length || 0) >= 3 ? 'text-purple-300' : 'text-slate-500'
                  }`}>
                    3-Ogohlantirish
                  </span>
                </div>
              </div>
            </div>

            {/* Ogohlantirish xabari */}
            {(student.warnings?.length || 0) >= 3 ? (
              <div className="bg-gradient-to-r from-red-900/50 to-purple-900/50 border-2 border-red-500/60 rounded-xl p-4">
                <p className="text-base text-center text-red-200 font-bold">
                  ⚠️ Agar 3 ta ogohlantirish olsangiz ProX akademiyasidan haydalasiz!
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4">
                <p className="text-sm text-center text-gray-400">
                  Agar 3 ta ogohlantirish olsangiz ProX akademiyasidan haydalasiz!
                </p>
              </div>
            )}

            {/* Ogohlantirishlar ro'yxati */}
            {student.warnings && student.warnings.length > 0 && (
              <div className="space-y-3">
                {student.warnings.map((warning: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-slate-800/70 border-2 border-slate-600/60 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        <span className="text-base font-bold text-orange-300">
                          {idx + 1}-Ogohlantirish sababi:
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {new Date(warning.date).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>
                    <p className="text-base text-white pl-7">{warning.reason}</p>
                    {warning.given_by && (
                      <p className="text-sm text-gray-400 pl-7">
                        Berdi: {warning.given_by}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
