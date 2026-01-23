import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Search, Edit, Target, Award, Lock, Plus, Save, X } from "lucide-react";
import { useBranchContext } from "../hooks/useBranchContext";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "../utils/auth";

export default function StudentProgress() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [totalBall, setTotalBall] = useState<string>("");
  const [totalStep, setTotalStep] = useState<string>("");
  const [todayBall, setTodayBall] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const { selectedBranch } = useBranchContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students-mongo", selectedBranch?.id],
    queryFn: async () => {
      const token = getAuthToken();
      const url = selectedBranch?.id ? `/api/students-mongo?branch_id=${selectedBranch.id}` : "/api/students-mongo";
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  const assignScoreMutation = useMutation({
    mutationFn: async (data: { student_id: string; score: number; step?: number; date: string }) => {
      const token = getAuthToken();
      const response = await fetch('/api/progress-mongo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed'); }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-students"] });
      queryClient.invalidateQueries({ queryKey: ["students-mongo"] });
      toast({ title: "Muvaffaqiyat!", description: "Ball va qadam saqlandi" });
      resetDialog();
    },
    onError: (error: Error) => { toast({ title: "Xatolik!", description: error.message, variant: "destructive" }); },
  });

  const resetDialog = () => {
    setSelectedStudent(""); setTotalBall(""); setTotalStep(""); setTodayBall("");
    setEditingStudent(null); setIsDialogOpen(false);
  };

  const filteredStudents = students.filter((student: any) => {
    const isStudentOffline = student.role === 'Student Offline';
    const matchesSearch = (student.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return isStudentOffline && matchesSearch;
  });

  const activeStudents = filteredStudents.filter((s: any) => !s.is_blocked);
  const blockedStudents = filteredStudents.filter((s: any) => s.is_blocked);

  const handleStudentClick = (student: any) => {
    if (student.is_blocked) {
      toast({ title: "Bloklangan", description: "To'lov qilmagan. To'lovlar bo'limidan to'landi qiling.", variant: "destructive" });
      return;
    }
    setEditingStudent(student);
    setSelectedStudent(student.id || student._id);
    setTotalBall((student.totalBall || 0).toString());
    setTotalStep((student.step || 0).toString());
    setTodayBall("");
    setIsDialogOpen(true);
  };

  const handleDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    let finalTotalBall = parseInt(totalBall) || 0;
    const todayBallValue = parseInt(todayBall) || 0;
    if (todayBallValue > 0) finalTotalBall += todayBallValue;
    
    if (finalTotalBall < 0) {
      toast({ title: "Xatolik!", description: "Ball manfiy bo'lishi mumkin emas", variant: "destructive" });
      return;
    }
    
    const submitData: any = { student_id: selectedStudent, score: finalTotalBall, date: new Date().toISOString().split('T')[0] };
    if (totalStep && totalStep.trim() !== '') submitData.step = parseInt(totalStep);
    
    assignScoreMutation.mutate(submitData);
  };

  const getPreviewTotalBall = () => (parseInt(totalBall) || 0) + (parseInt(todayBall) || 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="w-5 h-5 text-green-400" /></div>
        <div>
          <h1 className="text-xl font-semibold text-white">Qadam Belgilash</h1>
          <p className="text-xs text-slate-500">O'quvchilarga ball va qadam belgilash</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
        <input placeholder="Qidirish..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-9 pr-8" />
        {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X className="w-4 h-4" /></button>}
      </div>

      {/* Active Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {activeStudents.map((student: any) => (
          <div key={student.id || student._id} className="card-hover p-4 cursor-pointer" onClick={() => handleStudentClick(student)}>
            <div className="flex items-center gap-3">
              <div className="avatar avatar-cyan">{student.name?.charAt(0)?.toUpperCase() || 'N'}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{student.name}</h3>
                <p className="text-xs text-slate-500">{student.phone}</p>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/10"><Edit className="w-4 h-4 text-cyan-400" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-slate-800/50 rounded p-2 text-center">
                <p className="text-[10px] text-slate-500">Ball</p>
                <p className="text-sm font-medium text-cyan-400">{student.totalBall || 0}</p>
              </div>
              <div className="bg-slate-800/50 rounded p-2 text-center">
                <p className="text-[10px] text-slate-500">Qadam</p>
                <p className="text-sm font-medium text-green-400">{student.step || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Blocked Students */}
      {blockedStudents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Bloklangan ({blockedStudents.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {blockedStudents.map((student: any) => (
              <div key={student.id || student._id} className="card p-4 opacity-50 cursor-not-allowed border-red-500/20" onClick={() => handleStudentClick(student)}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="avatar bg-slate-700">{student.name?.charAt(0)?.toUpperCase() || 'N'}</div>
                    <Lock className="absolute -top-1 -right-1 w-4 h-4 text-red-400 bg-slate-900 rounded-full p-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-400 truncate">{student.name}</h3>
                    <p className="text-xs text-red-400">To'lov qilmagan</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">O'quvchilar topilmadi</p>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) resetDialog(); else setIsDialogOpen(o); }}>
        <DialogContent className="max-w-sm card border-slate-700">
          <DialogHeader><DialogTitle className="text-white">Ball va Qadam</DialogTitle></DialogHeader>
          {editingStudent && (
            <form onSubmit={handleDialogSubmit} className="space-y-4">
              <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                <h3 className="font-medium text-white">{editingStudent.name}</h3>
                <p className="text-xs text-slate-500">{editingStudent.phone}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Target className="w-3 h-3" /> Umumiy Ball</label>
                  <Input type="number" min="0" value={totalBall} onChange={(e) => setTotalBall(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Award className="w-3 h-3" /> Umumiy Qadam</label>
                  <Input type="number" min="0" value={totalStep} onChange={(e) => setTotalStep(e.target.value)} className="input" />
                </div>
              </div>
              
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <label className="text-xs text-cyan-400 flex items-center gap-1 mb-1"><Plus className="w-3 h-3" /> Bugungi Ball (qo'shiladi)</label>
                <Input type="number" min="0" value={todayBall} onChange={(e) => setTodayBall(e.target.value)} className="input" autoFocus />
                {todayBall && parseInt(todayBall) > 0 && (
                  <p className="text-xs text-cyan-400 mt-2">Yangi jami: <span className="font-bold">{getPreviewTotalBall()}</span></p>
                )}
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={resetDialog} className="flex-1 btn-secondary">Bekor</button>
                <button type="submit" disabled={assignScoreMutation.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {assignScoreMutation.isPending ? "..." : "Saqlash"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
