import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Search, Phone, CheckCircle, XCircle, X, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBranchContext } from "@/hooks/useBranchContext";
import api from "@/lib/axios";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

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
  const [exportFormat, setExportFormat] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedBranch } = useBranchContext();

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

  const exportToExcel = () => {
    try {
      const currentDay = new Date().getDate();
      // Ma'lumotlarni tayyorlash
      const exportData = filteredStudents.map((student, index) => ({
        '№': index + 1,
        'Ism': student.name || '',
        'Telefon': student.phone || '',
        'Oylik to\'lov': student.monthly_fee || 0,
        'To\'lov holati': student.current_month_payment === 'paid' ? 'To\'langan' : 'To\'lanmagan',
        'Oxirgi to\'lov': student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('uz-UZ') : 'Hech qachon',
        'Bloklangan': student.is_blocked ? 'Ha' : 'Yo\'q',
        'Holat': student.current_month_payment === 'paid' ? '✅ To\'langan' : 
                currentDay <= 10 ? '⏳ Kutilmoqda' : '❌ Muddat o\'tgan'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      const columnWidths = [
        { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'To\'lovlar');
      
      const currentDate = new Date().toLocaleDateString('uz-UZ').replace(/\./g, '-');
      const branchName = selectedBranch?.name ? selectedBranch.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Barcha_filiallar';
      const fileName = `Tolovlar_${branchName}_${currentDate}.xlsx`;
      
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

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDay = new Date().getDate();
      
      doc.setFontSize(14);
      doc.text("To'lovlar ro'yxati", 14, 12);
      
      doc.setFontSize(9);
      const branchName = selectedBranch?.name || 'Barcha filiallar';
      const currentDate = new Date().toLocaleDateString('uz-UZ');
      doc.text(`Filial: ${branchName}`, 14, 18);
      doc.text(`Sana: ${currentDate}`, 100, 18);
      doc.text(`Jami: ${filteredStudents.length} ta`, 180, 18);
      
      const tableData = filteredStudents.map((student, index) => [
        index + 1,
        student.name || '',
        student.phone || '',
        (student.monthly_fee || 0).toLocaleString(),
        student.current_month_payment === 'paid' ? "To'langan" : "To'lanmagan",
        student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('uz-UZ') : '-',
        student.is_blocked ? 'Ha' : "Yo'q",
        student.current_month_payment === 'paid' ? 'OK' : 
        currentDay <= 10 ? 'Kutish' : 'Kech'
      ]);

      autoTable(doc, {
        startY: 22,
        head: [['№', 'Ism', 'Telefon', "To'lov", 'Holat', 'Oxirgi', 'Blok', 'Status']],
        body: tableData,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 20, halign: 'center' }
        },
        margin: { top: 22, left: 10, right: 10, bottom: 10 },
        didDrawPage: (data: any) => {
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

      const fileName = `Tolovlar_${branchName.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate.replace(/\./g, '-')}.pdf`;
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

  const exportToPNG = async () => {
    try {
      const tableContainer = document.createElement('div');
      tableContainer.style.position = 'absolute';
      tableContainer.style.left = '-9999px';
      tableContainer.style.background = 'white';
      tableContainer.style.padding = '30px';
      
      const branchName = selectedBranch?.name || 'Barcha filiallar';
      const currentDate = new Date().toLocaleDateString('uz-UZ');
      const currentDay = new Date().getDate();
      
      tableContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 1600px;">
          <h2 style="color: #22c55e; margin-bottom: 15px; font-size: 32px;">To'lovlar ro'yxati</h2>
          <div style="display: flex; gap: 40px; margin-bottom: 20px; color: #475569; font-size: 18px;">
            <span>Filial: <strong style="color: #1e293b;">${branchName}</strong></span>
            <span>Sana: <strong style="color: #1e293b;">${currentDate}</strong></span>
            <span>Jami: <strong style="color: #1e293b;">${filteredStudents.length} ta</strong></span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 18px;">
            <thead>
              <tr style="background: #22c55e; color: white;">
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">№</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Ism</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Telefon</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: right; font-size: 18px;">Oylik to'lov</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">To'lov holati</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Oxirgi to'lov</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Blok</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.map((student, index) => {
                const bgColor = index % 2 === 0 ? '#f1f5f9' : 'white';
                const isPaid = student.current_month_payment === 'paid';
                const status = isPaid ? '✅ OK' : currentDay <= 10 ? '⏳ Kutish' : '❌ Kech';
                
                return `
                  <tr style="background: ${bgColor};">
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${index + 1}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-weight: 700; font-size: 18px;">${student.name || ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-size: 18px; font-weight: 600;">${student.phone || ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: right; color: #1e293b; font-size: 18px; font-weight: 600;">${(student.monthly_fee || 0).toLocaleString()}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: ${isPaid ? '#22c55e' : '#ef4444'}; font-size: 18px; font-weight: 700;">${isPaid ? "To'langan" : "To'lanmagan"}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('uz-UZ') : '-'}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.is_blocked ? 'Ha' : "Yo'q"}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      document.body.appendChild(tableContainer);
      
      const canvas = await html2canvas(tableContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `Tolovlar_${branchName.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate.replace(/\./g, '-')}.png`;
      link.href = imgData;
      link.click();
      
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

  const filteredStudents = useMemo(() => {
    return students.filter((s: Student) => {
      const isStudentOffline = s.role === 'Student Offline';
      const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone?.includes(searchTerm);
      
      // Branch filter
      let matchesBranch = true;
      if (selectedBranch) {
        const sBranchId = typeof s.branch_id === 'object' ? (s.branch_id as any)?._id?.toString() : s.branch_id?.toString();
        matchesBranch = sBranchId === selectedBranch.id;
      }
      
      return isStudentOffline && matchesSearch && matchesBranch;
    });
  }, [students, searchTerm, selectedBranch]);

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
          {/* Export Select */}
          <Select value={exportFormat} onValueChange={(value) => {
            setExportFormat(value);
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
