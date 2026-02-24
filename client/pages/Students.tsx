import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Trash2, Users, Search, X, Building2, Plus, Phone, Eye, EyeOff, Key, AlertTriangle, Shield, FileSpreadsheet, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import { useBranchContext } from "../hooks/useBranchContext";
import api from "@/lib/axios";
import { StudentCardSkeletonGrid } from "@/components/StudentCardSkeleton";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function Students() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; student: any | null }>({ open: false, student: null });
  const [warningDialog, setWarningDialog] = useState<{ open: boolean; student: any | null }>({ open: false, student: null });
  const [warningReason, setWarningReason] = useState("");
  const [unblockConfirm, setUnblockConfirm] = useState<{ open: boolean; student: any | null }>({ open: false, student: null });
  const [exportFormat, setExportFormat] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "", phone: "", role: "Student Offline", subscriptionPlan: "Pro",
    monthly_fee: 0, totalBall: 0, step: 0, joinDate: new Date().toISOString().split('T')[0],
    days: [] as string[], todayBall: "", workType: "", username: "", password: "", branch_id: "" as string | null
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedBranch } = useBranchContext();
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

  const { data: students = [], isLoading } = useQuery({
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

  const warningMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      api.post(`/students-mongo/${id}/warning`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-mongo'] });
      setWarningDialog({ open: false, student: null });
      setWarningReason("");
      toast({ title: "Muvaffaqiyat!", description: "Ogohlantirish berildi" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Xatolik!", 
        description: error.response?.data?.error || "Xatolik", 
        variant: "destructive" 
      });
    }
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => api.post(`/students-mongo/${id}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-mongo'] });
      setUnblockConfirm({ open: false, student: null });
      toast({ title: "Muvaffaqiyat!", description: "Blok olib tashlandi" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Xatolik!", 
        description: error.response?.data?.error || "Xatolik", 
        variant: "destructive" 
      });
    }
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
    setFormData({ name: student.name || "", phone: student.phone || "", role: student.role || "Student Offline", subscriptionPlan: student.subscriptionPlan || "Pro", monthly_fee: student.monthly_fee || 0, totalBall: student.totalBall || 0, step: student.step || 0, joinDate: formattedJoinDate, days: student.days || [], todayBall: student.todayBall || "", workType: student.workType || "", username: student.username || "", password: student.plainPassword || "", branch_id: student.branch_id?.toString() || null });
    setShowPassword(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (student: any) => {
    setDeleteConfirm({ open: true, student });
  };

  const handleWarning = (student: any) => {
    setWarningDialog({ open: true, student });
  };

  const handleUnblock = (student: any) => {
    setUnblockConfirm({ open: true, student });
  };

  const confirmDelete = () => {
    const studentId = deleteConfirm.student?.id || deleteConfirm.student?._id;
    if (studentId) {
      deleteMutation.mutate(studentId);
    }
  };

  const confirmWarning = () => {
    const studentId = warningDialog.student?.id || warningDialog.student?._id;
    if (studentId && warningReason.trim()) {
      warningMutation.mutate({ id: studentId, reason: warningReason.trim() });
    }
  };

  const confirmUnblock = () => {
    const studentId = unblockConfirm.student?.id || unblockConfirm.student?._id;
    if (studentId) {
      unblockMutation.mutate(studentId);
    }
  };

  const exportToExcel = () => {
    try {
      // Ma'lumotlarni tayyorlash
      const exportData = filteredStudents.map((student: any, index: number) => {
        const branch = typeof student.branch_id === 'object' 
          ? student.branch_id 
          : branches.find((b: any) => (b.id || b._id) === student.branch_id);
        
        return {
          '№': index + 1,
          'Ism': student.name || '',
          'Telefon': student.phone || '',
          'Login': student.username || '',
          'Parol': student.plainPassword || '',
          'Tarif': student.subscriptionPlan || 'Pro',
          'Oylik to\'lov': student.monthly_fee || 0,
          'Ball': student.totalBall || 0,
          'Qadam': student.step || 0,
          'Filial': branch?.name || 'Filialsiz',
          'Tuman': branch?.district || '',
          'Qo\'shilgan sana': student.joinDate ? new Date(student.joinDate).toLocaleDateString('uz-UZ') : '',
          'Ogohlantirishlar': student.warnings?.length || 0,
          'Bloklangan': student.is_blocked ? 'Ha' : 'Yo\'q',
          'Blok sanasi': student.blocked_at ? new Date(student.blocked_at).toLocaleDateString('uz-UZ') : '',
          'To\'lov holati': student.current_month_payment === 'paid' ? 'To\'langan' : 'To\'lanmagan',
          'Oxirgi to\'lov': student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('uz-UZ') : '',
          'Yaratilgan': student.created_at ? new Date(student.created_at).toLocaleDateString('uz-UZ') : ''
        };
      });

      // Excel fayl yaratish
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      // Ustun kengliklarini sozlash
      const columnWidths = [
        { wch: 5 },   // №
        { wch: 20 },  // Ism
        { wch: 15 },  // Telefon
        { wch: 15 },  // Login
        { wch: 12 },  // Parol
        { wch: 8 },   // Tarif
        { wch: 12 },  // Oylik to'lov
        { wch: 8 },   // Ball
        { wch: 8 },   // Qadam
        { wch: 15 },  // Filial
        { wch: 12 },  // Tuman
        { wch: 15 },  // Qo'shilgan sana
        { wch: 12 },  // Ogohlantirishlar
        { wch: 10 },  // Bloklangan
        { wch: 12 },  // Blok sanasi
        { wch: 12 },  // To'lov holati
        { wch: 12 },  // Oxirgi to'lov
        { wch: 12 }   // Yaratilgan
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'O\'quvchilar');
      
      // Fayl nomini yaratish
      const currentDate = new Date().toLocaleDateString('uz-UZ').replace(/\./g, '-');
      const branchName = selectedBranch?.name ? selectedBranch.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Barcha_filiallar';
      const fileName = `Oquvchilar_${branchName}_${currentDate}.xlsx`;
      
      // Faylni yuklab olish
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Xatolik!",
        description: "Excel faylni yaratishda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const exportToPNG = async () => {
    try {
      // Jadval uchun HTML element yaratish
      const tableContainer = document.createElement('div');
      tableContainer.style.position = 'absolute';
      tableContainer.style.left = '-9999px';
      tableContainer.style.background = 'white';
      tableContainer.style.padding = '30px';
      
      // Sarlavha
      const branchName = selectedBranch?.name || 'Barcha filiallar';
      const currentDate = new Date().toLocaleDateString('uz-UZ');
      
      tableContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 1800px;">
          <h2 style="color: #0ea5e9; margin-bottom: 15px; font-size: 32px;">O'quvchilar ro'yxati</h2>
          <div style="display: flex; gap: 40px; margin-bottom: 20px; color: #475569; font-size: 18px;">
            <span>Filial: <strong style="color: #1e293b;">${branchName}</strong></span>
            <span>Sana: <strong style="color: #1e293b;">${currentDate}</strong></span>
            <span>Jami: <strong style="color: #1e293b;">${filteredStudents.length} ta</strong></span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 18px;">
            <thead>
              <tr style="background: #0ea5e9; color: white;">
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">№</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Ism</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Telefon</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Login</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Tarif</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: right; font-size: 18px;">To'lov</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Ball</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Qadam</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Filial</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Sana</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Ogoh</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Blok</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.map((student: any, index: number) => {
                const branch = typeof student.branch_id === 'object' 
                  ? student.branch_id 
                  : branches.find((b: any) => (b.id || b._id) === student.branch_id);
                const bgColor = index % 2 === 0 ? '#f1f5f9' : 'white';
                
                return `
                  <tr style="background: ${bgColor};">
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${index + 1}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-weight: 700; font-size: 18px;">${student.name || ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-size: 18px; font-weight: 600;">${student.phone || ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-size: 18px; font-weight: 600;">${student.username || ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.subscriptionPlan || 'Pro'}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: right; color: #1e293b; font-size: 18px; font-weight: 600;">${(student.monthly_fee || 0).toLocaleString()}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.totalBall || 0}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.step || 0}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-size: 18px; font-weight: 600;">${branch?.name || '-'}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.joinDate ? new Date(student.joinDate).toLocaleDateString('uz-UZ') : ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.warnings?.length || 0}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.is_blocked ? 'Ha' : "Yo'q"}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      document.body.appendChild(tableContainer);
      
      // Screenshot olish
      const canvas = await html2canvas(tableContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // PNG ga konvert qilish
      const imgData = canvas.toDataURL('image/png');
      
      // Yuklab olish
      const link = document.createElement('a');
      link.download = `Oquvchilar_${branchName.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate.replace(/\./g, '-')}.png`;
      link.href = imgData;
      link.click();
      
      // Tozalash
      document.body.removeChild(tableContainer);
    } catch (error) {
      console.error('PNG export error:', error);
      toast({
        title: "Xatolik!",
        description: "PNG faylni yaratishda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      
      // Sarlavha
      doc.setFontSize(14);
      doc.text("O'quvchilar ro'yxati", 14, 12);
      
      // Filial va sana ma'lumotlari
      doc.setFontSize(9);
      const branchName = selectedBranch?.name || 'Barcha filiallar';
      const currentDate = new Date().toLocaleDateString('uz-UZ');
      doc.text(`Filial: ${branchName}`, 14, 18);
      doc.text(`Sana: ${currentDate}`, 100, 18);
      doc.text(`Jami: ${filteredStudents.length} ta`, 180, 18);
      
      // Jadval uchun ma'lumotlarni tayyorlash
      const tableData = filteredStudents.map((student: any, index: number) => {
        const branch = typeof student.branch_id === 'object' 
          ? student.branch_id 
          : branches.find((b: any) => (b.id || b._id) === student.branch_id);
        
        return [
          index + 1,
          student.name || '',
          student.phone || '',
          student.username || '',
          student.subscriptionPlan || 'Pro',
          (student.monthly_fee || 0).toLocaleString(),
          student.totalBall || 0,
          student.step || 0,
          branch?.name || '-',
          student.joinDate ? new Date(student.joinDate).toLocaleDateString('uz-UZ') : '',
          student.warnings?.length || 0,
          student.is_blocked ? 'Ha' : "Yo'q"
        ];
      });

      // Jadval yaratish
      autoTable(doc, {
        startY: 22,
        head: [[
          '№',
          'Ism',
          'Telefon',
          'Login',
          'Tarif',
          "To'lov",
          'Ball',
          'Qadam',
          'Filial',
          'Sana',
          'Ogoh',
          'Blok'
        ]],
        body: tableData,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [14, 165, 233], // cyan-500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },   // №
          1: { cellWidth: 35 },                     // Ism
          2: { cellWidth: 22 },                     // Telefon
          3: { cellWidth: 22 },                     // Login
          4: { cellWidth: 12, halign: 'center' },   // Tarif
          5: { cellWidth: 18, halign: 'right' },    // To'lov
          6: { cellWidth: 12, halign: 'center' },   // Ball
          7: { cellWidth: 12, halign: 'center' },   // Qadam
          8: { cellWidth: 30 },                     // Filial
          9: { cellWidth: 20, halign: 'center' },   // Sana
          10: { cellWidth: 12, halign: 'center' },  // Ogoh
          11: { cellWidth: 12, halign: 'center' }   // Blok
        },
        margin: { top: 22, left: 10, right: 10, bottom: 10 },
        didDrawPage: (data: any) => {
          // Sahifa raqami
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.text(
            `Sahifa ${data.pageNumber} / ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 5,
            { align: 'center' }
          );
        }
      });

      // Fayl nomini yaratish
      const fileName = `Oquvchilar_${branchName.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate.replace(/\./g, '-')}.pdf`;
      
      // PDF ni yuklab olish
      doc.save(fileName);
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Xatolik!",
        description: "PDF faylni yaratishda xatolik yuz berdi",
        variant: "destructive"
      });
    }
  };

  const filteredStudents = (students as any[]).filter((s: any) => {
    const matchesSearch = !debouncedSearch || s.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.phone?.includes(debouncedSearch);
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
        <div className="flex gap-2">
          {/* Export Select */}
          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={(value) => {
              setExportFormat(value);
              // Tanlangandan keyin darhol export qilish
              setTimeout(() => {
                if (value === 'excel') exportToExcel();
                else if (value === 'pdf') exportToPDF();
                else if (value === 'png') exportToPNG();
                setExportFormat("");
              }, 100);
            }}>
              <SelectTrigger className="input w-40">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Yuklash</span>
                </div>
              </SelectTrigger>
              <SelectContent className="card border-slate-700">
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    <span>Excel</span>
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span>PDF</span>
                  </div>
                </SelectItem>
                <SelectItem value="png">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>PNG Rasm</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
                <div className="flex items-center gap-2 text-xs text-slate-400"><Key className="w-3 h-3" /> Kirish ma'lumotlari</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="username" value={formData.username} onChange={handleInputChange} className="input" placeholder="Login" />
                  <div className="relative"><Input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} className="input pr-8" placeholder="Parol" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                </div>
                {editingStudent && formData.username && (
                  <div className="text-xs text-slate-500 mt-2">
                    Login: <span className="text-cyan-400">{formData.username}</span>
                    {formData.password && <> / Parol: <span className="text-cyan-400">{formData.password}</span></>}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="flex-1 btn-secondary">Bekor</Button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 btn-primary">{(createMutation.isPending || updateMutation.isPending) ? "..." : "Saqlash"}</button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
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

      {isLoading ? (
        <StudentCardSkeletonGrid count={6} />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title={students.length > 0 ? "Topilmadi" : "O'quvchilar yo'q"}
          description={students.length > 0 ? "Qidiruv shartlariga mos o'quvchilar topilmadi" : "Birinchi o'quvchingizni qo'shing"}
          action={students.length === 0 ? {
            label: "Yangi O'quvchi",
            onClick: () => { resetForm(); setIsDialogOpen(true); }
          } : undefined}
        />
      ) : (
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
              {s.username && <div className="mt-3 p-2 bg-slate-800/30 rounded text-xs text-slate-400 flex items-center gap-1 flex-wrap"><Key className="w-3 h-3 text-cyan-400 flex-shrink-0" /><span className="truncate">{s.username}</span>{s.plainPassword && <><span className="text-slate-600">/</span><span className="text-cyan-400">{s.plainPassword}</span></>}</div>}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-slate-800/50 rounded p-2 text-center"><p className="text-[10px] text-slate-500">Ball</p><p className="text-sm font-medium text-cyan-400">{s.totalBall || 0}</p></div>
                <div className="bg-slate-800/50 rounded p-2 text-center"><p className="text-[10px] text-slate-500">Qadam</p><p className="text-sm font-medium text-green-400">{s.step || 0}</p></div>
                <div className="bg-slate-800/50 rounded p-2 text-center"><p className="text-[10px] text-slate-500">To'lov</p><p className="text-sm font-medium text-purple-400">{(s.monthly_fee || 0).toLocaleString()}</p></div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{s.joinDate ? new Date(s.joinDate).toLocaleDateString('ru-RU') : ''}</span>
                  {/* Ogohlantirish va blok holati */}
                  {s.warnings && s.warnings.length > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-orange-400" />
                      <span className="text-xs text-orange-400">{s.warnings.length}/3</span>
                    </div>
                  )}
                  {s.is_blocked && (
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-red-400" />
                      <span className="text-xs text-red-400">Bloklangan</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {/* Blokni ochish tugmasi */}
                  {s.is_blocked && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUnblock(s); }} 
                      className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      title="Blokni ochish"
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Ogohlantirish berish tugmasi */}
                  {!s.is_blocked && (user?.role === 'mentor' || user?.role === 'manager' || user?.role === 'super_admin') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWarning(s); }} 
                      className="p-1.5 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                      title="Ogohlantirish berish"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(s); }} className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, student: null })}
        onConfirm={confirmDelete}
        title="O'quvchini o'chirish"
        description={`${deleteConfirm.student?.name} ni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        confirmText="O'chirish"
        cancelText="Bekor qilish"
        variant="danger"
        icon="delete"
        isLoading={deleteMutation.isPending}
      />

      {/* Warning Dialog */}
      <Dialog open={warningDialog.open} onOpenChange={(open) => {
        setWarningDialog({ open, student: null });
        setWarningReason("");
      }}>
        <DialogContent className="max-w-md card border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Ogohlantirish berish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-300">O'quvchi: <span className="text-white font-medium">{warningDialog.student?.name}</span></p>
              <p className="text-xs text-slate-500 mt-1">
                Hozirgi ogohlantirishlar: {warningDialog.student?.warnings?.length || 0}/3
              </p>
            </div>
            <div>
              <Label className="text-slate-400 text-sm">Ogohlantirish sababi</Label>
              <textarea
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                className="input mt-2 min-h-[80px] resize-none"
                placeholder="Ogohlantirish sababini kiriting..."
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1">{warningReason.length}/200</p>
            </div>
            {warningDialog.student?.warnings?.length === 2 && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300 font-medium">⚠️ Diqqat!</p>
                <p className="text-xs text-red-400 mt-1">
                  Bu 3-chi ogohlantirish bo'ladi va o'quvchi avtomatik ravishda 1 yilga bloklanadi.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setWarningDialog({ open: false, student: null });
                  setWarningReason("");
                }} 
                className="flex-1 btn-secondary"
              >
                Bekor qilish
              </Button>
              <button 
                onClick={confirmWarning}
                disabled={!warningReason.trim() || warningMutation.isPending}
                className="flex-1 btn-primary bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                {warningMutation.isPending ? "Yuklanmoqda..." : "Ogohlantirish berish"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirm Dialog */}
      <ConfirmDialog
        open={unblockConfirm.open}
        onOpenChange={(open) => setUnblockConfirm({ open, student: null })}
        onConfirm={confirmUnblock}
        title="Blokni ochish"
        description={`${unblockConfirm.student?.name} ning blokini ochmoqchimisiz? Barcha ogohlantirishlar ham o'chiriladi.`}
        confirmText="Blokni ochish"
        cancelText="Bekor qilish"
        variant="warning"
        icon="warning"
        isLoading={unblockMutation.isPending}
      />
    </div>
  );
}
