import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Download, Trash2, RefreshCw, Clock, HardDrive, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Backup {
  name: string;
  size: string;
  date: string;
}

interface BackupStats {
  totalBackups: number;
  totalSize: string;
  oldestBackup: string | null;
  newestBackup: string | null;
}

export default function Backup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; backup: Backup | null }>({ 
    open: false, 
    backup: null 
  });
  const [restoreConfirm, setRestoreConfirm] = useState<{ open: boolean; backup: Backup | null }>({ 
    open: false, 
    backup: null 
  });

  const { data: backups = [], isLoading } = useQuery<Backup[]>({
    queryKey: ["backups"],
    queryFn: async () => {
      const res = await api.get("/backup");
      // Ensure we always return an array
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 30000 // 30 sekund
  });

  const { data: stats } = useQuery<BackupStats>({
    queryKey: ["backup-stats"],
    queryFn: () => api.get("/backup/stats").then(res => res.data),
    refetchInterval: 30000
  });

  const createBackupMutation = useMutation({
    mutationFn: () => api.post("/backup/create"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["backup-stats"] });
      toast({ title: "Muvaffaqiyat!", description: "Backup yaratildi" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Xatolik!", 
        description: error.response?.data?.message || "Backup yaratishda xatolik",
        variant: "destructive" 
      });
    }
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (backupName: string) => api.post(`/backup/restore/${backupName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast({ 
        title: "Muvaffaqiyat!", 
        description: "Ma'lumotlar tiklandi. Sahifani yangilang.",
        duration: 5000
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Xatolik!", 
        description: error.response?.data?.message || "Restore xatolik",
        variant: "destructive" 
      });
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (backupName: string) => api.delete(`/backup/${backupName}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["backup-stats"] });
      toast({ title: "Muvaffaqiyat!", description: "Backup o'chirildi" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Xatolik!", 
        description: error.response?.data?.message || "O'chirishda xatolik",
        variant: "destructive" 
      });
    }
  });

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleRestore = (backup: Backup) => {
    setRestoreConfirm({ open: true, backup });
  };

  const confirmRestore = () => {
    if (restoreConfirm.backup) {
      restoreBackupMutation.mutate(restoreConfirm.backup.name);
      setRestoreConfirm({ open: false, backup: null });
    }
  };

  const handleDelete = (backup: Backup) => {
    setDeleteConfirm({ open: true, backup });
  };

  const confirmDelete = () => {
    if (deleteConfirm.backup) {
      deleteBackupMutation.mutate(deleteConfirm.backup.name);
      setDeleteConfirm({ open: false, backup: null });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return "Hozirgina";
    if (diffHours < 24) return `${diffHours} soat oldin`;
    if (diffDays === 1) return "Kecha";
    return `${diffDays} kun oldin`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Backup Tizimi</h1>
            <p className="text-xs text-slate-500">Ma'lumotlar zaxirasi va tiklash</p>
          </div>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={createBackupMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {createBackupMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Yaratilmoqda...
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              Yangi Backup
            </>
          )}
        </button>
      </div>

      {/* Warning */}
      <div className="card p-4 bg-orange-500/10 border-orange-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-400 mb-1">Muhim!</p>
            <p className="text-xs text-slate-400">
              Restore qilish barcha joriy ma'lumotlarni o'chiradi va backup'dan tiklaydi. 
              Restore qilishdan oldin yangi backup yarating!
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalBackups}</p>
                <p className="text-xs text-slate-500">Jami Backup</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <HardDrive className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalSize}</p>
                <p className="text-xs text-slate-500">Jami Hajm</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {stats.newestBackup ? getTimeAgo(stats.newestBackup) : "Yo'q"}
                </p>
                <p className="text-xs text-slate-500">Oxirgi Backup</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">02:00</p>
                <p className="text-xs text-slate-500">Avtomatik (har kuni)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backups List */}
      <div className="card p-5">
        <h3 className="font-medium text-white mb-4">Backup Ro'yxati</h3>
        
        {backups.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">Hali backup yo'q</p>
            <button onClick={handleCreateBackup} className="btn-primary">
              Birinchi Backup Yaratish
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup, index) => (
              <div
                key={backup.name}
                className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{backup.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{formatDate(backup.date)}</span>
                      <span>•</span>
                      <span>{backup.size}</span>
                      <span>•</span>
                      <span className="text-cyan-400">{getTimeAgo(backup.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(backup)}
                    disabled={restoreBackupMutation.isPending}
                    className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                    title="Tiklash"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(backup)}
                    disabled={deleteBackupMutation.isPending || index === 0}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={index === 0 ? "Oxirgi backup o'chirib bo'lmaydi" : "O'chirish"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, backup: null })}
        onConfirm={confirmDelete}
        title="Backup O'chirish"
        description={`${deleteConfirm.backup?.name} ni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        confirmText="O'chirish"
        cancelText="Bekor qilish"
        variant="danger"
        icon="delete"
        isLoading={deleteBackupMutation.isPending}
      />

      {/* Restore Confirm Dialog */}
      <ConfirmDialog
        open={restoreConfirm.open}
        onOpenChange={(open) => setRestoreConfirm({ open, backup: null })}
        onConfirm={confirmRestore}
        title="Ma'lumotlarni Tiklash"
        description={`${restoreConfirm.backup?.name} dan tiklashni xohlaysizmi? Barcha joriy ma'lumotlar o'chiriladi va backup'dan tiklanadi. Bu amalni qaytarib bo'lmaydi!`}
        confirmText="Tiklash"
        cancelText="Bekor qilish"
        variant="danger"
        icon="warning"
        isLoading={restoreBackupMutation.isPending}
      />
    </div>
  );
}
