import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { STORAGE_KEYS } from "../utils/constants";
import {
  loginUser,
  signupUser,
  getCurrentUser,
  logoutUser,
  loginWithGoogle as loginWithGoogleService,
  resetUserPassword,
} from "../services/authService";

export type UserRole = "citizen" | "government";

export interface User {
  id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  signup: (
    name: string,
    email: string,
    password: string,
    role?: UserRole
  ) => Promise<boolean>;
  loginWithGoogle: (role?: UserRole) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  updateUser: (updatedFields: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      // 1. Check local storage
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        try {
          const parsed: User = JSON.parse(storedUser);
          setUser(parsed);
        } catch {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }

      // 2. Validate session with backend /auth/me
      try {
        const remoteUser = await getCurrentUser();
        if (remoteUser) {
          setUser({
            id: remoteUser.id,
            firebaseUid: remoteUser.firebaseUid,
            name: remoteUser.name,
            email: remoteUser.email,
            role: remoteUser.role,
          });
        }
      } catch (err) {
        console.warn("[AUTH] Session verification note:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
    role: UserRole
  ): Promise<boolean> => {
    try {
      const { user: authUser } = await loginUser(email, password, role);
      setUser({
        id: authUser.id,
        firebaseUid: authUser.firebaseUid,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
      });
      return true;
    } catch (error) {
      console.error("[AUTH] Login error:", error);
      return false;
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: UserRole = "citizen"
  ): Promise<boolean> => {
    try {
      const { user: authUser } = await signupUser(name, email, password, role);
      setUser({
        id: authUser.id,
        firebaseUid: authUser.firebaseUid,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
      });
      return true;
    } catch (error) {
      console.error("[AUTH] Signup error:", error);
      return false;
    }
  };

  const loginWithGoogle = async (role: UserRole = "citizen"): Promise<boolean> => {
    try {
      const { user: authUser } = await loginWithGoogleService(role);
      setUser({
        id: authUser.id,
        firebaseUid: authUser.firebaseUid,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
      });
      return true;
    } catch (error) {
      console.error("[AUTH] Google login error:", error);
      return false;
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<boolean> => {
    try {
      const { user: authUser } = await resetUserPassword(email, newPassword);
      setUser({
        id: authUser.id,
        firebaseUid: authUser.firebaseUid,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
      });
      return true;
    } catch (error) {
      console.error("[AUTH] Password reset error:", error);
      return false;
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedFields };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
      return merged;
    });
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
        loginWithGoogle,
        resetPassword,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}