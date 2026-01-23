export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("auth_token");
  const user = localStorage.getItem("user");
  
  if (!token || !user) {
    return false;
  }
  
  try {
    JSON.parse(user);
    return true;
  } catch {
    // Invalid user data, clear storage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    return false;
  }
};

export const clearAuthData = (): void => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
  localStorage.removeItem("selected_branch");
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

export const getAuthUser = () => {
  const user = localStorage.getItem("user");
  if (!user) return null;
  
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};