import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Trash2, Users, Search, X, Building2, Plus, Phone, Eye, EyeOff, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import api from "@/lib/axios";

export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "", phone: "", role: "Student Offline", subscriptionPlan: "Pro",
    monthly_fee: 0, totalBall: 0, step: 0, joinDate: new Date().toISOString().split('T')[0],
    days: [] as string[], todayBall: "", workType: "", username: "", password: "", branch_id: "" as string | null
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const branchId = searchParams.get('branch');
    if (branchId) setSelectedBranchId(branchId);
    if ((user?.role === 'mentor' || user?.role === 'manager') && user?.branch_id) {
      setFormData(prev => ({ ...prev, branch_id: user.branch_id }));
    }
  }, [searchParams, user]);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-mongo'],
    queryFn: () => api.get('/branches-mongo').then(res => res.data as any[])
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-mongo'],
    queryFn: () => api.get('/students-mongo').then(res => res.data as any[])
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/students-mongo', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-mongo'] });
      setIsDialogOpen(false); resetForm();
      toast({ title: "Muvaffaqiyat!", description: "O'quvchi qo'shildi" });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik!", description: error.response?.data?.error || "Xatolik", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/students-mongo/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-mongo'] });
      setIsDialogOpen(false); setEditingStudent(null); resetForm();
      toast({ title: "Muvaffaqiyat!", description: "Yangilandi" });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik!", description: error.response?.data?.error || "Xatolik", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/students-mongo/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-mongo'] });
      toast({ title: "Muvaffaqiyat!", description: "O'chirildi" });
    },
    onError: () => toast({ title: "Xatolik!", variant: "destructive" })
  });

  const resetForm = () => {
    let initialBranchId = "";
    if ((user?.role === 'mentor' || user?.role === 'manager') && user?.branch_id) initialBranchId = user.branch_id;
    setFormData({ name: "", phone: "", role: "Student Offline", subscriptionPlan: "Pro", monthly_fee: 0, totalBall: 0, step: 0, joinDate: new Date().toISOString().split('T')[0], days: [], todayBall: "", workType: "", username: "", password: "", branch_id: initialBranchId || null });
    setEditingStudent(null);
    setShowPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = { ...formData, days: Array.isArray(formData.days) ? formData.days : [] };
    if (editingStudent) updateMutation.mutate({ id: editingStudent.id, data: submitData });
    else createMutation.mutate(submitData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value }));
  };

  const handleEdit = (student: any) => {
    const studentId = student.id || student._id;
    if (!studentId) return;
    let formattedJoinDate = new Date().toISOString().split('T')[0];
    if (student.joinDate) { try { const d = new Date(student.joinDate); if (!isNaN(d.getTime())) formattedJoinDate = d.toISOString().split('T')[0]; } catch {} }
    setEditingStudent({ ...student, id: studentId });
    setFormData({ name: student.name || "", phone: student.phone || "", role: student.role || "Student Offline", subscriptionPlan: student.subscriptionPlan || "Pro", monthly_fee: student.monthly_fee || 0, totalBall: student.totalBall || 0, step: student.step || 0, joinDate: formattedJoinDate, days: student.days || [], todayBall: student.todayBall || "", workType: student.workType || "", username: student.username || "", password: student.plainPassword || student.password || "", branch_id: student.branch_id?.toString() || null });
    setShowPassword(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (student: any) => {
    const studentId = student.id || student._id;
    if (!studentId) return;
    if (window.confirm("O'chirmoqchimisiz?")) deleteMutation.mutate(studentId);
  };

  const filteredStudents = (students as any[]).filter((s: any) => {
    const matchesSearch = !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.phone?.includes(searchQuery);
    const sBranchId = typeof s.branch_id === 'object' ? s.branch_id?._id?.toString() : s.branch_id?.toString();
    const matchesBranch = !selectedBranchId || selectedBranchId === "all" || (selectedBranchId === "no-branch" && !s.branch_id) || sBranchId === selectedBranchId;
    return matchesSearch && matchesBranch;
  });

  const getPlanColor = (plan: string) => plan === 'VIP' ? 'badge-purple' : plan === 'Gold' ? 'badge-yellow' : 'badge-cyan';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10"><Users className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <h1 className="text-xl font-semibold text-white">O'quvchilar</h1>
            <p className="text-xs text-slate-500">Jami: {students.length}</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><button className="btn-primary flex items-center gap-2" onClick={resetForm}><Plus className="w-4 h-4" /> Yangi</button></DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto card border-slate-700">
            <DialogHeader><DialogTitle className="text-white">{editingStudent ? "Tahrirlash" : "Yangi o'quvchi"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label className="text-slate-400 text-xs">Ism</Label><Input name="name" value={formData.name} onChange={handleInputChange} className="input mt-1" /></div>
              <div><Label className="text-slate-400 text-xs">Telefon</Label><Input name="phone" value={formData.phone} onChange={handleInputChange} className="input mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-400 text-xs">Tarif</Label>
                  <Select value={formData.subscriptionPlan} onValueChange={(v) => setFormData(p => ({ ...p, subscriptionPlan: v }))}>
                    <SelectTrigger className="input mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="card border-slate-700"><SelectItem value="Pro">Pro</SelectItem><SelectItem value="Gold">Gold</SelectItem><SelectItem value="VIP">VIP</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label className="text-slate-400 text-xs">To'lov</Label><Input name="monthly_fee" type="number" value={formData.monthly_fee} onChange={handleInputChange} className="input mt-1" /></div>
              </div>
              {user?.role === 'super_admin' && <div><Label className="text-slate-400 text-xs">Filial</Label>
                <Select value={formData.branch_id || "no-branch"} onValueChange={(v) => setFormData(p => ({ ...p, branch_id: v === "no-branch" ? "" : v }))}>
                  <SelectTrigger className="input mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="card border-slate-700"><SelectItem value="no-branch">Filialsiz</SelectItem>{branches.map((b: any) => <SelectItem key={b.id || b._id} value={b.id || b._id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>}
              <div><Label className="text-slate-400 text-xs">Sana</Label><Input name="joinDate" type="date" value={formData.joinDate} onChange={handleInputChange} className="input mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-slate-400 text-xs">Ball</Label><Input name="totalBall" type="number" value={formData.totalBall} onChange={handleInputChange} className="input mt-1" /></div>
                <div><Label className="text-slate-400 text-xs">Qadam</Label><Input name="step" type="number" value={formData.step} onChange={handleInputChange} className="input mt-1" /></div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400"><Key className="w-3 h-3" /> Kirish</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="username" value={formData.username} onChange={handleInputChange} className="input" placeholder="Login" />
                  <div className="relative"><Input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} className="input pr-8" placeholder="Parol" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="flex-1 btn-secondary">Bekor</Button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 btn-primary">{(createMutation.isPending || updateMutation.isPending) ? "..." : "Saqlash"}</button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input placeholder="Qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-9 pr-8" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X className="w-4 h-4" /></button>}
        </div>
        {user?.role === 'super_admin' && <Select value={selectedBranchId || "all"} onValueChange={(v) => { setSelectedBranchId(v === "all" ? "" : v); setSearchParams(v === "all" ? {} : { branch: v }); }}>
          <SelectTrigger className="input w-full sm:w-40"><SelectValue placeholder="Filial" /></SelectTrigger>
          <SelectContent className="card border-slate-700"><SelectItem value="all">Barchasi</SelectItem><SelectItem value="no-branch">Filialsiz</SelectItem>{branches.map((b: any) => <SelectItem key={b.id || b._id} value={b.id || b._id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStudents.map((s: any, i: number) => {
          const sId = s.id || s._id;
          const bName = typeof s.branch_id === 'object' ? s.branch_id?.name : branches.find((b: any) => (b.id || b._id) === s.branch_id)?.name;
          return (
            <div key={sId || i} className="card-hover p-4 cursor-pointer" onClick={() => navigate(`/students/${sId}`)}>
              <div className="flex items-start gap-3">
                <div className={`avatar ${s.subscriptionPlan === 'VIP' ? 'avatar-purple' : s.subscriptionPlan === 'Gold' ? 'avatar-yellow' : 'avatar-cyan'}`}>{s.name?.charAt(0)?.toUpperCase() || 'N'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><h3 className="font-medium text-white truncate">{s.name}</h3><span className={getPlanColor(s.subscriptionPlan)}>{s.subscriptionPlan || 'Pro'}</span></div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5"><Phone className="w-3 h-3" /> {s.phone}</div>
                  {bName && <div className="flex items-center gap-1 text-slate-600 text-xs mt-0.5"><Building2 className="w-3 h-3" /> {bName}</div>}
                </div>
              </div>
              {s.username && <div className="mt-3 p-2 bg-slate-800/30 rounded text-xs text-slate-400 flex items-center gap-1"><Key className="w-3 h-3 text-cyan-400" />{s.username} {(s.plainPassword || s.password) && <span className="text-cyan-400">/ {s.plainPassword || s.password}</span>}</div>}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-slate-800/50 rounded p-2 text-center"><p className="text-[10px] text-slate-500">Ball</p><p className="text-sm font-medium text-cyan-400">{s.totalBall || 0}</p></div>
                <div className="bg-slate-800/50 rounded p-2 text-center"><p className="text-[10px] text-slate-500">Qadam</p><p className="text-sm font-medium text-green-400">{s.step || 0}</p></div>
                <div className="bg-slate-800/50 rounded p-2 text-center"><p className="text-[10px] text-slate-500">To'lov</p><p className="text-sm font-medium text-purple-400">{(s.monthly_fee || 0).toLocaleString()}</p></div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-slate-500">{s.joinDate ? new Date(s.joinDate).toLocaleDateString('ru-RU') : ''}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(s); }} className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredStudents.length === 0 && <div className="text-center py-12"><Users className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">{students.length > 0 ? "Topilmadi" : "O'quvchilar yo'q"}</p></div>}
    </div>
  );
}
