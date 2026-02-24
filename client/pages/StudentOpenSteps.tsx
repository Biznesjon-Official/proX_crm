import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Award, Search, RefreshCw, TrendingDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useBranchContext } from "@/hooks/useBranchContext";
import api from "@/lib/axios";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

interface StudentStep {
  _id: string;
  fullName: string;
  login: string;
  currentStep: number;  // prox.uz dan (submissions)
  step: number;         // CRM dan (mentor)
  totalBall: number;
  progress: number;
  branch_id?: string;   // Branch ID
}

export default function StudentOpenSteps() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"currentStep" | "progress">("currentStep");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exportFormat, setExportFormat] = useState<string>("");
  const { selectedBranch } = useBranchContext();
  const { toast } = useToast();

  const { data: students = [], isLoading, refetch } = useQuery<StudentStep[]>({
    queryKey: ["students-with-steps"],
    queryFn: () => api.get("/students-mongo/with-steps").then((res) => res.data),
    staleTime: 60000, // 1 minut cache
    gcTime: 300000, // 5 minut garbage collection
  });

  // Memoized filter va sort - qayta render bo'lganda qayta hisoblanmaydi
  const sortedStudents = useMemo(() => {
    let filtered = students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.login.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Branch filter
    if (selectedBranch) {
      filtered = filtered.filter((student) => {
        const sBranchId = typeof student.branch_id === 'object' 
          ? (student.branch_id as any)?._id?.toString() 
          : student.branch_id?.toString();
        return sBranchId === selectedBranch.id;
      });
    }
    
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "currentStep") {
        comparison = a.currentStep - b.currentStep;
      } else if (sortBy === "progress") {
        comparison = a.progress - b.progress;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [students, searchQuery, sortBy, sortOrder, selectedBranch]);

  // Memoized stats - filtered students uchun
  const stats = useMemo(() => ({
    total: sortedStudents.length,
    avgCurrentStep:
      sortedStudents.length > 0
        ? Math.round(sortedStudents.reduce((sum, s) => sum + s.currentStep, 0) / sortedStudents.length)
        : 0,
    avgStep:
      sortedStudents.length > 0
        ? Math.round(sortedStudents.reduce((sum, s) => sum + s.step, 0) / sortedStudents.length)
        : 0,
    avgProgress:
      sortedStudents.length > 0
        ? Math.round(sortedStudents.reduce((sum, s) => sum + s.progress, 0) / sortedStudents.length)
        : 0,
  }), [sortedStudents]);

  const handleSort = (field: "currentStep" | "progress") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const exportToExcel = () => {
    try {
      // Ma'lumotlarni tayyorlash
      const exportData = sortedStudents.map((student, index) => ({
        '№': index + 1,
        'Ism': student.fullName || '',
        'Login': student.login || '',
        'Hozirgi qadam (prox.uz)': student.currentStep || 0,
        'Jami qadam (CRM)': student.step || 0,
        'Qadam farqi': (student.step || 0) - (student.currentStep || 0),
        'Ball': student.totalBall || 0,
        'Progress (%)': student.progress || 0,
        'Holat': student.currentStep === 0 ? 'Boshlamagan' : 
                student.currentStep >= student.step ? 'Yaxshi' : 'Orqada qolgan'
      }));

      // Excel fayl yaratish
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      // Ustun kengliklarini sozlash
      const columnWidths = [
        { wch: 5 },   // №
        { wch: 20 },  // Ism
        { wch: 15 },  // Login
        { wch: 18 },  // Hozirgi qadam
        { wch: 15 },  // Jami qadam
        { wch: 12 },  // Qadam farqi
        { wch: 8 },   // Ball
        { wch: 12 },  // Progress
        { wch: 15 }   // Holat
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'O\'quvchilar_qadamlari');
      
      // Fayl nomini yaratish
      const currentDate = new Date().toLocaleDateString('uz-UZ').replace(/\./g, '-');
      const branchName = selectedBranch?.name ? selectedBranch.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Barcha_filiallar';
      const fileName = `Oquvchilar_qadamlari_${branchName}_${currentDate}.xlsx`;
      
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

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      
      doc.setFontSize(14);
      doc.text("O'quvchilar qadamlari", 14, 12);
      
      doc.setFontSize(9);
      const branchName = selectedBranch?.name || 'Barcha filiallar';
      const currentDate = new Date().toLocaleDateString('uz-UZ');
      doc.text(`Filial: ${branchName}`, 14, 18);
      doc.text(`Sana: ${currentDate}`, 100, 18);
      doc.text(`Jami: ${sortedStudents.length} ta`, 180, 18);
      
      const tableData = sortedStudents.map((student, index) => [
        index + 1,
        student.fullName || '',
        student.login || '',
        student.currentStep || 0,
        student.step || 0,
        (student.step || 0) - (student.currentStep || 0),
        student.totalBall || 0,
        `${student.progress || 0}%`,
        student.currentStep === 0 ? 'Boshlamagan' : 
        student.currentStep >= student.step ? 'Yaxshi' : 'Orqada'
      ]);

      autoTable(doc, {
        startY: 22,
        head: [['№', 'Ism', 'Login', 'Hozirgi', 'Jami', 'Farq', 'Ball', 'Progress', 'Holat']],
        body: tableData,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [14, 165, 233],
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
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 20, halign: 'center' },
          8: { cellWidth: 25, halign: 'center' }
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

      const fileName = `Oquvchilar_qadamlari_${branchName.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate.replace(/\./g, '-')}.pdf`;
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
      
      tableContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif; width: 1600px;">
          <h2 style="color: #0ea5e9; margin-bottom: 15px; font-size: 32px;">O'quvchilar qadamlari</h2>
          <div style="display: flex; gap: 40px; margin-bottom: 20px; color: #475569; font-size: 18px;">
            <span>Filial: <strong style="color: #1e293b;">${branchName}</strong></span>
            <span>Sana: <strong style="color: #1e293b;">${currentDate}</strong></span>
            <span>Jami: <strong style="color: #1e293b;">${sortedStudents.length} ta</strong></span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 18px;">
            <thead>
              <tr style="background: #0ea5e9; color: white;">
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">№</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Ism</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; font-size: 18px;">Login</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Hozirgi qadam</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Jami qadam</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Farq</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Ball</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Progress</th>
                <th style="border: 2px solid #94a3b8; padding: 14px; text-align: center; font-size: 18px;">Holat</th>
              </tr>
            </thead>
            <tbody>
              ${sortedStudents.map((student, index) => {
                const bgColor = index % 2 === 0 ? '#f1f5f9' : 'white';
                const holat = student.currentStep === 0 ? 'Boshlamagan' : 
                             student.currentStep >= student.step ? 'Yaxshi' : 'Orqada qolgan';
                
                return `
                  <tr style="background: ${bgColor};">
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${index + 1}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-weight: 700; font-size: 18px;">${student.fullName || ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; color: #1e293b; font-size: 18px; font-weight: 600;">${student.login || ''}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.currentStep || 0}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.step || 0}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${(student.step || 0) - (student.currentStep || 0)}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.totalBall || 0}</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${student.progress || 0}%</td>
                    <td style="border: 2px solid #cbd5e1; padding: 12px; text-align: center; color: #1e293b; font-size: 18px; font-weight: 600;">${holat}</td>
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
      link.download = `Oquvchilar_qadamlari_${branchName.replace(/[^a-zA-Z0-9]/g, '_')}_${currentDate.replace(/\./g, '-')}.png`;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">O'quvchilar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">O'quvchilar qadamlari</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            O'quvchilarning qadam va natijalarini kuzatish
          </p>
        </div>
        <div className="flex gap-2">
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
          <button
            onClick={() => refetch()}
            className="p-2 sm:px-3 sm:py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Yangilash</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-slate-400">Jami o'quvchi</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.avgCurrentStep}</p>
              <p className="text-xs text-slate-400">O'rtacha hozirgi qadam</p>
              <p className="text-[10px] text-slate-500">prox.uz</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.avgStep}</p>
              <p className="text-xs text-slate-400">O'rtacha jami qadam</p>
              <p className="text-[10px] text-slate-500">CRM</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.avgProgress}%</p>
              <p className="text-xs text-slate-400">O'rtacha progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-[30%]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="O'quvchi ismi yoki login bo'yicha qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-800/40 border border-slate-700/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-700/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  O'quvchi
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Login
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition"
                  onClick={() => handleSort("currentStep")}
                >
                  <div className="flex items-center gap-1">
                    Hozirgi qadam
                    {sortBy === "currentStep" && (
                      <span className="text-cyan-400">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 font-normal normal-case">prox.uz</p>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <div>Jami qadam</div>
                  <p className="text-[10px] text-slate-600 font-normal normal-case">CRM</p>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition"
                  onClick={() => handleSort("progress")}
                >
                  <div className="flex items-center gap-1">
                    Progress
                    {sortBy === "progress" && (
                      <span className="text-cyan-400">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {sortedStudents.map((student, index) => {
                const isDebtor = student.progress < 100;
                return (
                  <tr key={student._id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 text-sm text-slate-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {student.fullName[0]}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-white">{student.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{student.login}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${
                          student.currentStep > 0 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-slate-700/50 text-slate-500'
                        }`}>
                          {student.currentStep > 0 ? `${student.currentStep}-qadam` : 'Boshlanmagan'}
                        </span>
                        {student.currentStep > 0 && (
                          <span className="text-xs text-green-400">✓</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium">
                        {student.step}-qadam
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px]">
                          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isDebtor
                                  ? "bg-gradient-to-r from-red-500 to-orange-500"
                                  : "bg-gradient-to-r from-green-500 to-emerald-500"
                              }`}
                              style={{ width: `${Math.min(student.progress, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            isDebtor ? "text-red-400" : "text-green-400"
                          }`}
                        >
                          {student.progress}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {sortedStudents.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">
              {searchQuery ? "Qidiruv natijasi topilmadi" : "O'quvchilar topilmadi"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
