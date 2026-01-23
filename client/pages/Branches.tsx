import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Building2, MapPin, Phone, Users, Eye, Crown, Sparkles, GraduationCap, Key, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBranchContext } from "../hooks/useBranchContext";
import { useAuth } from "../hooks/useAuth";
import api from "@/lib/axios";
import type { Branch, CreateBranchRequest } from "@shared/types";

export default function Branches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<CreateBranchRequest>({ name: "", district: "", address: "", phone: "", username: "", password: "" });
  const [branchType, setBranchType] = useState<"mentor" | "manager">("manager");
  // Mentor ma'lumotlari
  const [mentorData, setMentorData] = useState({ name: "", username: "", password: "" });
  const [showMentorPassword, setShowMentorPassword] = useState(false);
  // Manager ma'lumotlari
  const [managerData, setManagerData] = useState({ name: "", username: "", password: "" });
  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSelectedBranch } = useBranchContext();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches-mongo').then(res => res.data),
    retry: 1
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => api.get('/students').then(res => res.data),
    retry: false, enabled: false
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/branches-mongo', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsDialogOpen(false); resetForm();
      const credentials = response.data?.credentials;
      toast({ title: "Muvaffaqiyat!", description: credentials ? `Filial yaratildi! Login: ${credentials.username}` : "Filial yaratildi!", duration: 5000 });
    },
    onError: (error: any) => { toast({ title: "Xatolik!", description: error.response?.data?.error || "Xatolik yuz berdi.", variant: "destructive" }); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/branches-mongo/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); setIsDialogOpen(false); resetForm(); toast({ title: "Muvaffaqiyat!", description: "Filial yangilandi." }); },
    onError: () => { toast({ title: "Xatolik!", description: "Yangilashda xatolik.", variant: "destructive" }); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branches-mongo/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); toast({ title: "Muvaffaqiyat!", description: "Filial o'chirildi." }); },
    onError: () => { toast({ title: "Xatolik!", description: "O'chirishda xatolik.", variant: "destructive" }); }
  });

  const resetForm = () => { 
    setFormData({ name: "", district: "", address: "", phone: "", username: "", password: "" }); 
    setEditingBranch(null); 
    setBranchType("manager"); 
    setMentorData({ name: "", username: "", password: "" });
    setManagerData({ name: "", username: "", password: "" });
    setShowMentorPassword(false);
    setShowManagerPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = { 
      name: formData.name, 
      district: formData.district, 
      address: formData.address, 
      phone: formData.phone, 
      branch_type: branchType,
      // Mentor ma'lumotlari
      mentor_name: mentorData.name,
      mentor_username: mentorData.username,
      mentor_password: mentorData.password,
      // Manager ma'lumotlari
      manager_name: managerData.name,
      manager_username: managerData.username,
      manager_password: managerData.password
    };
    if (editingBranch) { 
      updateMutation.mutate({ id: editingBranch.id, data: submitData }); 
    }
    else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({ name: branch.name, district: branch.district, address: branch.address, phone: branch.phone, username: "", password: "" });
    setBranchType((branch as any).branch_type || 'manager');
    // Mentor ma'lumotlarini yuklash
    setMentorData({
      name: (branch as any).mentor_name || "",
      username: (branch as any).mentor_username || "",
      password: (branch as any).mentor_password || ""
    });
    // Manager ma'lumotlarini yuklash
    setManagerData({
      name: (branch as any).manager_user_name || "",
      username: (branch as any).manager_username || "",
      password: (branch as any).manager_user_password || ""
    });
    setShowMentorPassword(true);
    setShowManagerPassword(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => { if (confirm("Bu filialni o'chirishni xohlaysizmi?")) deleteMutation.mutate(id); };
  const getStudentCount = (branch: any) => branch.student_count || 0;
  const handleViewStudents = (branchId: string) => navigate(`/students?branch=${branchId}`);

  const handleViewBranch = (branch: Branch) => {
    if (user?.role === 'super_admin') { navigate(`/students?branch=${branch.id}`); }
    else {
      const branchForContext = { ...branch, created_at: typeof branch.created_at === 'string' ? branch.created_at : branch.created_at.toISOString(), updated_at: typeof branch.updated_at === 'string' ? branch.updated_at : branch.updated_at.toISOString() };
      setSelectedBranch(branchForContext);
      navigate(`/branches/${branch.id}`);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 animate-fade-in-down">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Filiallar</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-slate-500">Jami: <span className="text-cyan-400 font-medium">{branches.length}</span></span>
              <span className="text-sm text-slate-500">O'quvchilar: <span className="text-white font-medium">{students.length}</span></span>
            </div>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button onClick={resetForm} className="btn-pro flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Yangi Filial</span>
            </button>
          </DialogTrigger>
          <DialogContent className="glass-card border-slate-700/50 max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                {editingBranch ? "Tahrirlash" : "Yangi Filial"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label className="text-slate-300">Filial nomi</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-pro mt-1" required /></div>
              <div><Label className="text-slate-300">Tuman</Label><Input value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="input-pro mt-1" required /></div>
              <div><Label className="text-slate-300">Manzil</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-pro mt-1" required /></div>
              <div><Label className="text-slate-300">Telefon</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-pro mt-1" required /></div>
              
              {user?.role === 'super_admin' && (
                <div className="pt-4 border-t border-slate-700/50">
                  <Label className="text-slate-300 mb-3 block">Filial turi</Label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setBranchType('mentor')} className={`flex-1 p-3 rounded-xl border-2 transition-all ${branchType === 'mentor' ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'}`}>
                      <div className="flex items-center justify-center gap-2"><GraduationCap className="w-5 h-5" /><span className="font-medium">Mentor</span></div>
                    </button>
                    <button type="button" onClick={() => setBranchType('manager')} className={`flex-1 p-3 rounded-xl border-2 transition-all ${branchType === 'manager' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'}`}>
                      <div className="flex items-center justify-center gap-2"><Building2 className="w-5 h-5" /><span className="font-medium">Manager</span></div>
                    </button>
                  </div>
                </div>
              )}

              {/* Mentor (O'qituvchi) ma'lumotlari - faqat Mentor tanlanganda */}
              {user?.role === 'super_admin' && branchType === 'mentor' && (
                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/20">
                  <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Mentor uchun login/parol
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400 text-xs">Login</Label>
                      <Input 
                        value={mentorData.username} 
                        onChange={(e) => setMentorData({ ...mentorData, username: e.target.value })} 
                        className="input-pro mt-1" 
                        placeholder="Login" 
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Parol</Label>
                      <div className="relative mt-1">
                        <Input 
                          type={showMentorPassword ? "text" : "password"}
                          value={mentorData.password} 
                          onChange={(e) => setMentorData({ ...mentorData, password: e.target.value })} 
                          className="input-pro pr-10" 
                          placeholder="Parol" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowMentorPassword(!showMentorPassword)} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                          {showMentorPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Manager ma'lumotlari - faqat Manager tanlanganda */}
              {user?.role === 'super_admin' && branchType === 'manager' && (
                <div className="p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/20">
                  <h4 className="text-sm font-medium text-cyan-300 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Manager uchun login/parol
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-400 text-xs">Login</Label>
                      <Input 
                        value={managerData.username} 
                        onChange={(e) => setManagerData({ ...managerData, username: e.target.value })} 
                        className="input-pro mt-1" 
                        placeholder="Login" 
                      />
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Parol</Label>
                      <div className="relative mt-1">
                        <Input 
                          type={showManagerPassword ? "text" : "password"}
                          value={managerData.password} 
                          onChange={(e) => setManagerData({ ...managerData, password: e.target.value })} 
                          className="input-pro pr-10" 
                          placeholder="Parol" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowManagerPassword(!showManagerPassword)} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                          {showManagerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 btn-pro-ghost">Bekor</Button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 btn-pro">
                  {editingBranch ? "Yangilash" : "Yaratish"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch: Branch, index: number) => {
          const isAdmin = branch.name === "G'ijduvon" || (branch as any).branch_type === 'admin';
          const hasMentor = (branch as any).mentor_username;
          return (
            <div key={branch.id} className="card-pro p-5 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${isAdmin ? 'bg-gradient-to-br from-yellow-400 to-orange-600 shadow-yellow-500/30' : 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/30'}`}>
                    {isAdmin ? <Crown className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{branch.name}</h3>
                    <span className="text-xs text-slate-500 capitalize">{(branch as any).branch_type || 'manager'}</span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">{branch.district}, {branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Phone className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>{branch.phone}</span>
                </div>
              </div>

              {/* Mentor Info */}
              {hasMentor && (
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-purple-300">Mentor</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Key className="w-3 h-3" />
                    <span>{(branch as any).mentor_username}</span>
                    <span className="text-purple-400">/ {(branch as any).mentor_password}</span>
                  </div>
                </div>
              )}

              {/* Manager Info */}
              {(branch as any).manager_username && (
                <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-300">Manager</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Key className="w-3 h-3" />
                    <span>{(branch as any).manager_username}</span>
                    <span className="text-cyan-400">/ {(branch as any).manager_user_password}</span>
                  </div>
                </div>
              )}

              {/* Students Count */}
              <button onClick={() => handleViewStudents(branch.id)} className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all mb-4 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">O'quvchilar</p>
                    <p className="text-2xl font-bold text-cyan-400 group-hover:text-cyan-300">{getStudentCount(branch)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-all">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => handleViewBranch(branch)} className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="Ko'rish">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => handleEdit(branch)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all" title="Tahrirlash">
                  <Edit className="w-4 h-4" />
                </button>
                {branch.name !== "G'ijduvon" && (
                  <button onClick={() => handleDelete(branch.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="O'chirish">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
