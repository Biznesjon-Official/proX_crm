import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Branch interface ni local da e'lon qilaman
interface Branch {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface BranchContextType {
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
  clearSelectedBranch: () => void;
}

// Default value bilan context yarataman
const defaultValue: BranchContextType = {
  selectedBranch: null,
  setSelectedBranch: () => {},
  clearSelectedBranch: () => {},
};

const BranchContext = createContext<BranchContextType>(defaultValue);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // LocalStorage dan yuklash
  useEffect(() => {
    try {
      const saved = localStorage.getItem("selected_branch");
      if (saved) {
        const branch = JSON.parse(saved);
        setSelectedBranch(branch);
      }
    } catch (error) {
      console.error("Error parsing saved branch:", error);
      localStorage.removeItem("selected_branch");
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // LocalStorage ga saqlash
  const handleSetSelectedBranch = (branch: Branch | null) => {
    try {
      setSelectedBranch(branch);
      if (branch) {
        localStorage.setItem("selected_branch", JSON.stringify(branch));
      } else {
        localStorage.removeItem("selected_branch");
      }
    } catch (error) {
      console.error("Error saving branch:", error);
    }
  };

  const clearSelectedBranch = () => {
    try {
      setSelectedBranch(null);
      localStorage.removeItem("selected_branch");
    } catch (error) {
      console.error("Error clearing branch:", error);
    }
  };

  const value: BranchContextType = {
    selectedBranch,
    setSelectedBranch: handleSetSelectedBranch,
    clearSelectedBranch,
  };

  // Initialization kutish
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext(): BranchContextType {
  const context = useContext(BranchContext);
  
  // Agar context undefined bo'lsa, default value qaytaraman
  if (!context) {
    console.warn("useBranchContext used outside of BranchProvider, returning default values");
    return defaultValue;
  }
  
  return context;
}

// Xavfsiz hook - agar provider yo'q bo'lsa null qaytaradi
export function useBranchContextSafe() {
  const context = useContext(BranchContext);
  return context || defaultValue;
}