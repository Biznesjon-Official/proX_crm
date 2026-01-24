import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, AlertTriangle, CheckCircle, Users, Calendar, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function PaymentSchedulerWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unblockConfirm, setUnblockConfirm] = useState<{ open: boolean; student: any | null }>({ 
    open: false, 
    student: null 
  });

  const { data: blockedStudents = [] } = useQuery({
    queryKey: ['blocked-students'],
    queryFn: () => api.get('/students-mongo').then(res => 
      res.data.filter((s: any) => s.is_blocked === true)
    ),
    refetchInterval: 60000 // Har 1 daqiqada yangilash
  });

  const { data: unpaidStudents = [] } = useQuery({
    queryKey: ['unpaid-students'],
    queryFn: () => api.get('/students-mongo').then(res => 
      res.data.filter((s: any) => 
        s.current_month_payment === 'unpaid' && !s.is_blocked
      )
    ),
    refetchInterval: 60000
  });

  // Keyingi bloklash sanasini hisoblash
  const getNextBlockDate = () => {
    const today = new Date();
    const currentDay = today.getDate();
    
    if (currentDay <= 10) {
      // Bu oyning 11-sanasi
      const nextBlock = new Date(today.getFullYear(), today.getMonth(), 11);
      return nextBlock;
    } else {
      // Keyingi oyning 11-sanasi
      const nextBlock = new Date(today.getFullYear(), today.getMonth() + 1, 11);
      return nextBlock;
    }
  };

  const nextBlockDate = getNextBlockDate();
  const daysUntilBlock = Math.ceil((nextBlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Unblock mutation
  const unblockMutation = useMutation({
    mutationFn: (studentId: string) => 
      api.put(`/students-mongo/${studentId}`, { 
        is_blocked: false,
        current_month_payment: 'paid',
        last_payment_date: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-students'] });
      queryClient.invalidateQueries({ queryKey: ['students-mongo'] });
      toast({ 
        title: "Muvaffaqiyat!", 
        description: "O'quvchi blokdan chiqarildi" 
      });
    },
    onError: () => {
      toast({ 
        title: "Xatolik!", 
        variant: "destructive" 
      });
    }
  });

  const handleUnblock = (student: any) => {
    setUnblockConfirm({ open: true, student });
  };

  const confirmUnblock = () => {
    if (unblockConfirm.student) {
      unblockMutation.mutate(unblockConfirm.student._id || unblockConfirm.student.id);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="font-medium text-white">To'lov Scheduler</h3>
        </div>
        <span className="text-xs text-slate-500">Avtomatik</span>
      </div>

      {/* Next Block Date */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Keyingi bloklash</p>
            <p className="text-lg font-bold text-cyan-400">
              {nextBlockDate.toLocaleDateString('uz-UZ', { 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {daysUntilBlock} kun qoldi
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3">
        {/* Blocked Students */}
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400">Bloklangan</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{blockedStudents.length}</p>
          <p className="text-xs text-slate-500 mt-1">o'quvchi</p>
        </div>

        {/* Unpaid Students */}
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400">To'lanmagan</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{unpaidStudents.length}</p>
          <p className="text-xs text-slate-500 mt-1">o'quvchi</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-400">
            <p className="font-medium text-slate-300 mb-1">Avtomatik bloklash</p>
            <p>Har oyning 11-sanasida to'lov qilmagan o'quvchilar avtomatik bloklanadi.</p>
          </div>
        </div>
      </div>

      {/* Blocked Students List */}
      {blockedStudents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Bloklangan o'quvchilar:</p>
            <span className="text-xs text-red-400">{blockedStudents.length} ta</span>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {blockedStudents.map((student: any) => {
              const blockedDate = student.blocked_at ? new Date(student.blocked_at) : null;
              const daysBlocked = blockedDate 
                ? Math.floor((Date.now() - blockedDate.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              
              return (
                <div 
                  key={student._id || student.id} 
                  className="flex items-center justify-between p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-red-400 flex-shrink-0" />
                      <span className="text-xs text-white truncate">{student.name}</span>
                    </div>
                    {blockedDate && (
                      <div className="flex items-center gap-2 ml-5">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        <span className="text-[10px] text-slate-500">
                          {daysBlocked === 0 
                            ? 'Bugun bloklandi' 
                            : `${daysBlocked} kun oldin bloklandi`}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnblock(student)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-green-500/20 text-green-400 flex-shrink-0"
                    title="Blokdan chiqarish"
                  >
                    <Unlock className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unblock Confirmation Dialog */}
      <ConfirmDialog
        open={unblockConfirm.open}
        onOpenChange={(open) => setUnblockConfirm({ open, student: null })}
        onConfirm={confirmUnblock}
        title="Blokdan chiqarish"
        description={`${unblockConfirm.student?.name} ni blokdan chiqarasizmi? To'lov qilingan deb belgilanadi.`}
        confirmText="Chiqarish"
        cancelText="Bekor qilish"
        variant="warning"
        icon="warning"
        isLoading={unblockMutation.isPending}
      />
    </div>
  );
}
