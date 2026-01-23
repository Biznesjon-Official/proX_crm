import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../../shared/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("user");
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        
        // branch_id ni string sifatida saqlash
        const cleanUserData = {
          ...parsedUser,
          branch_id: typeof parsedUser.branch_id === 'object' && parsedUser.branch_id?._id
            ? parsedUser.branch_id._id.toString()
            : parsedUser.branch_id
        };
        
        setUser(cleanUserData);
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    // branch_id ni string sifatida saqlash
    const cleanUserData = {
      ...userData,
      branch_id: typeof userData.branch_id === 'object' && (userData.branch_id as any)?._id
        ? (userData.branch_id as any)._id.toString()
        : userData.branch_id
    };
    
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user", JSON.stringify(cleanUserData));
    setUser(cleanUserData);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}