import { AlertTriangle, Trash2, Lock, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  icon?: "delete" | "block" | "logout" | "warning";
  isLoading?: boolean;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Tasdiqlash",
  cancelText = "Bekor qilish",
  variant = "danger",
  icon = "warning",
  isLoading = false,
}: ConfirmDialogProps) {
  const icons = {
    delete: Trash2,
    block: Lock,
    logout: LogOut,
    warning: AlertTriangle,
  };

  const Icon = icons[icon];

  const variantStyles = {
    danger: {
      iconBg: "bg-red-500/20 border-red-500/30",
      iconColor: "text-red-400",
      button: "btn-danger",
    },
    warning: {
      iconBg: "bg-yellow-500/20 border-yellow-500/30",
      iconColor: "text-yellow-400",
      button: "bg-yellow-500 hover:bg-yellow-600 text-white",
    },
    info: {
      iconBg: "bg-cyan-500/20 border-cyan-500/30",
      iconColor: "text-cyan-400",
      button: "btn-primary",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="card border-slate-700 max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className={`w-16 h-16 rounded-xl ${styles.iconBg} border flex items-center justify-center`}
            >
              <Icon className={`w-8 h-8 ${styles.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-white text-xl mb-2">
                {title}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 btn-secondary"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className={`flex-1 ${styles.button} disabled:opacity-50`}
          >
            {isLoading ? "..." : confirmText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
