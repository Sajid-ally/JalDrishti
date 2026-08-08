import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { STORAGE_KEYS } from "../utils/constants";

export type UserRole = "citizen" | "government";

interface User {
    id: string;
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
        password: string
    ) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<
    AuthContextType | undefined
>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({
    children,
}: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem(
            STORAGE_KEYS.USER
        );

        if (storedUser) {
            try {
                const parsedUser: User = JSON.parse(storedUser);
                setUser(parsedUser);
            } catch {
                localStorage.removeItem(STORAGE_KEYS.USER);
            }
        }

        setIsLoading(false);
    }, []);

    const login = async (
        email: string,
        password: string,
        role: UserRole
    ): Promise<boolean> => {
        // Temporary frontend authentication.
        // TODO: Replace with backend API call — POST /api/auth/login
        // The backend should validate credentials and return { user, token }
        // where user contains the verified role.

        if (!email || !password) {
            return false;
        }

        const mockUser: User = {
            id: "USR-001",
            name: email.split("@")[0],
            email,
            role,
        };

        localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(mockUser)
        );

        localStorage.setItem(
            STORAGE_KEYS.AUTH_TOKEN,
            "temporary-token"
        );

        setUser(mockUser);

        return true;
    };

    const signup = async (
        name: string,
        email: string,
        password: string
    ): Promise<boolean> => {
        // Temporary frontend signup.
        // TODO: Replace with backend API call — POST /api/auth/signup

        if (!name || !email || !password) {
            return false;
        }

        const newUser: User = {
            id: `USR-${Date.now()}`,
            name,
            email,
            role: "citizen", // New signups default to citizen
        };

        localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(newUser)
        );

        localStorage.setItem(
            STORAGE_KEYS.AUTH_TOKEN,
            "temporary-token"
        );

        setUser(newUser);

        return true;
    };

    const logout = () => {
        localStorage.removeItem(
            STORAGE_KEYS.USER
        );

        localStorage.removeItem(
            STORAGE_KEYS.AUTH_TOKEN
        );

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
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}