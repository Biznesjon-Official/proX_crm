import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Building2, Users, BarChart3, TrendingUp, DollarSign, Menu, X, LogOut, User, CheckCircle, Database, BookOpen } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useBranchContext } from "../hooks/useBranchContext";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MenuItem {
  title: string;
  icon: any;
  path: string;
  roles?: string[];
}

const allMenuItems: MenuItem[] = [
  { title: "Dashboard", icon: BarChart3, path: "/", roles: ['super_admin', 'manager'] },
  { title: "Filiallar", icon: Building2, path: "/branches", roles: ['super_admin'] },
  { title: "O'quvchilar", icon: Users, path: "/students", roles: ['super_admin', 'mentor', 'manager'] },
  { title: "Qadam Belgilash", icon: TrendingUp, path: "/student-progress", roles: ['super_admin', 'mentor', 'manager'] },
  { title: "Qadam Topshirish", icon: CheckCircle, path: "/student-open-steps", roles: ['super_admin', 'mentor', 'manager'] },
  { title: "O'quvchi Tekshirish", icon: BookOpen, path: "/student-exam", roles: ['super_admin', 'mentor', 'manager'] },
  { title: "To'lovlar", icon: DollarSign, path: "/payments", roles: ['super_admin', 'manager'] },
  { title: "Backup", icon: Database, path: "/backup", roles: ['super_admin'] },
  { title: "Profil", icon: User, path: "/student-profile", roles: ['student'] },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { selectedBranch, setSelectedBranch, clearSelectedBranch } = useBranchContext();
  
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-mongo'],
    queryFn: () => api.get('/branches-mongo').then(res => res.data),
    enabled: user?.role === 'super_admin' || user?.role === 'manager'
  });
  
  const menuItems = allMenuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-slate-800 text-white rounded-lg border border-slate-700"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 h-screen flex flex-col bg-slate-900 border-r border-slate-800
        fixed lg:sticky top-0 left-0 z-40 
        transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">P</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">proX Akademiya</h1>
              <p className="text-xs text-slate-500">CRM Tizimi</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.title}
                className={isActive ? 'menu-item-active w-full' : 'menu-item w-full'}
                onClick={() => handleMenuClick(item.path)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-cyan-500/20' : 'bg-slate-800'
                }`}>
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                </div>
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
            <div className="avatar-cyan flex-shrink-0">
              {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Branch Selector Header - Only for super_admin and manager */}
        {(user?.role === 'super_admin' || user?.role === 'manager') && (
          <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <Select 
                value={selectedBranch?.id || "all"} 
                onValueChange={(value) => {
                  if (value === "all") {
                    clearSelectedBranch();
                  } else {
                    const branch = branches.find((b: any) => (b.id || b._id) === value);
                    if (branch) {
                      setSelectedBranch({
                        id: branch.id || branch._id,
                        name: branch.name,
                        district: branch.district,
                        address: branch.address,
                        phone: branch.phone,
                        created_at: branch.created_at,
                        updated_at: branch.updated_at
                      });
                    }
                  }
                }}
              >
                <SelectTrigger className="input w-full sm:w-64 h-9">
                  <SelectValue placeholder="Filial tanlash" />
                </SelectTrigger>
                <SelectContent className="card border-slate-700">
                  <SelectItem value="all">Barcha filiallar</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id || branch._id} value={branch.id || branch._id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBranch && (
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {selectedBranch.district}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="p-4 sm:p-6 pt-16 lg:pt-6 min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
