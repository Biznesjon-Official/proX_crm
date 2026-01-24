import "./global.css";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Branches from "./pages/Branches";
import Students from "./pages/Students";
import StudentProgress from "./pages/StudentProgress";
import StudentOpenSteps from "./pages/StudentOpenSteps";
import StudentDetail from "./pages/StudentDetail";
import StudentPercentage from "./pages/StudentPercentage";
import StudentProfile from "./pages/StudentProfile";
import StudentExam from "./pages/StudentExam";
import Payments from "./pages/Payments";
import Backup from "./pages/Backup";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./hooks/useAuth";
import { BranchProvider } from "./hooks/useBranchContext";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BranchProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="branches" element={<Branches />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetail />} />
                <Route path="student-progress" element={<StudentProgress />} />
                <Route path="student-open-steps" element={<StudentOpenSteps />} />
                <Route path="student-percentage" element={<StudentPercentage />} />
                <Route path="student-profile" element={<StudentProfile />} />
                <Route path="student-exam" element={<StudentExam />} />
                <Route path="payments" element={<Payments />} />
                <Route path="backup" element={<Backup />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </BranchProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);