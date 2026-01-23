import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Search, Phone, CheckCircle, XCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";

interface Student {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  monthly_fee: number;
  is_blocked: boolean;
  branch_id?: string;
  role?: string;
  current_month_payment?: 'paid' | 'unpaid';
  last_payment_date?: string;
}

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students-mongo"],
    queryFn: () => api.get("/students-mongo").then(res => res.data),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ studentId, isPaid }: { studentId: string; isPaid: boolean }) => {
      return api.put(`/students-mongo/${studentId}`, { 
        current_month_payment: isPaid ? 'paid' : 'unpaid',
        last_payment_date: isPaid ? new Date().toISOString() : null,
        is_blocked: isPaid ? false : (new Date().getDate() > 10)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-mongo"] });
      toast({ title: "Muvaffaqiyat!", description: "To'lov yangilandi" });
    },
    onError: () => {
      toast({ title: "Xatolik!", variant: "destructive" });
    },
  });

  const handleTogglePayment = (student: Student) => {
    const isPaid = student.current_month_payment === 'paid';
    updatePaymentMutation.mutate({ studentId: student._id || student.id!, isPaid: !isPaid });
  };

  const filteredStudents = students.filter((s: Student) => {
    const isStudentOffline = s.role === 'Student Offline';
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone?.includes(searchTerm);
    return isStudentOffline && matchesSearch;
  });

  const paidCount = filteredStudents.filter((s: Student) => s.current_month_payment === 'paid').length;
  const unpaidCount = filteredStudents.length - paidCount;
  const currentDay = new Date().getDate();

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><DollarSign className="w-5 h-5 text-green-400" /></div>
          <div>
            <h1 className="text-xl font-semibold text-white">To'lovlar</h1>
            <p className="text-xs text-slate-500">Bugun: {currentDay}-sana {currentDay <= 10 ? '(to\'lov davri)' : '(muddat o\'tgan)'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-xs text-green-400">To'langan: {paidCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-xs text-red-400">To'lanmagan: {unpaidCount}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
        <input placeholder="Qidirish..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-9 pr-8" />
        {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X className="w-4 h-4" /></button>}
      </div>

      {/* Students List */}
      <div className="space-y-2">
        {filteredStudents.map((student: Student, i: number) => {
          const isPaid = student.current_month_payment === 'paid';
          return (
            <div key={student._id || student.id || i} className="card-hover p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`avatar ${isPaid ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
                  {student.name?.charAt(0)?.toUpperCase() || 'N'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{student.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.phone}</span>
                    <span>{(student.monthly_fee || 0).toLocaleString()} so'm</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{(student.monthly_fee || 0).toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {isPaid ? <CheckCircle className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                    <span className={isPaid ? 'text-green-400' : 'text-red-400'}>{isPaid ? 'To\'langan' : 'To\'lanmagan'}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleTogglePayment(student)}
                  disabled={updatePaymentMutation.isPending}
                  className={`relative w-12 h-6 rounded-full transition-all ${isPaid ? 'bg-green-500' : 'bg-red-500'} ${updatePaymentMutation.isPending ? 'opacity-50' : 'hover:opacity-90'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isPaid ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">O'quvchilar topilmadi</p>
        </div>
      )}
    </div>
  );
}
