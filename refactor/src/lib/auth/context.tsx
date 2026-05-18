"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { api, setUnauthorizedHandler, type User } from "@/lib/api/client";
import { useRouter } from "next/navigation";

const TOKEN_STORAGE_KEY = "jwt_token";
const ALIAS_ORIGINAL_TOKEN_KEY = "jwt_original_token";
const ALIAS_ORIGINAL_USER_KEY = "jwt_original_user";

function readStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function readStoredOriginalUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedOriginalUser = localStorage.getItem(ALIAS_ORIGINAL_USER_KEY);
  if (!savedOriginalUser) {
    return null;
  }

  try {
    return JSON.parse(savedOriginalUser) as User;
  } catch {
    localStorage.removeItem(ALIAS_ORIGINAL_USER_KEY);
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  originalUser: User | null;
  isAliasing: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  startAlias: (userId: number) => Promise<void>;
  exitAlias: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [originalUser, setOriginalUser] = useState<User | null>(readStoredOriginalUser);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearAliasStorage = useCallback(() => {
    localStorage.removeItem(ALIAS_ORIGINAL_TOKEN_KEY);
    localStorage.removeItem(ALIAS_ORIGINAL_USER_KEY);
    setOriginalUser(null);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    clearAliasStorage();
    setToken(null);
    setUser(null);
  }, [clearAliasStorage]);

  // Registra handler per auto-logout su 401
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      router.push("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession, router]);

  // Carica token dal localStorage al mount
  useEffect(() => {
    const validateSession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await api.auth.me(token);
        setUser(data.user);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    void validateSession();
  }, [clearSession, token]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await api.auth.login(username, password);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      clearAliasStorage();
      setToken(data.token);
      setUser(data.user);
      router.push("/dashboard");
    },
    [clearAliasStorage, router],
  );

  const startAlias = useCallback(
    async (userId: number) => {
      if (!token || !user) {
        throw new Error("Sessione non disponibile");
      }

      const data = await api.sistema.startAlias(token, userId);
      localStorage.setItem(ALIAS_ORIGINAL_TOKEN_KEY, token);
      localStorage.setItem(ALIAS_ORIGINAL_USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      setOriginalUser(user);
      setToken(data.token);
      setUser(data.user);
      router.push("/dashboard");
    },
    [router, token, user],
  );

  const exitAlias = useCallback(async () => {
    const originalToken = localStorage.getItem(ALIAS_ORIGINAL_TOKEN_KEY);
    const storedOriginalUser = localStorage.getItem(ALIAS_ORIGINAL_USER_KEY);

    if (!token || !originalToken || !storedOriginalUser) {
      throw new Error("Alias non attivo");
    }

    const parsedOriginalUser = JSON.parse(storedOriginalUser) as User;

    await api.sistema.exitAlias(
      token,
      parsedOriginalUser.username,
      parsedOriginalUser.roles[0],
    ).catch(() => {});

    try {
      const data = await api.auth.me(originalToken);
      localStorage.setItem(TOKEN_STORAGE_KEY, originalToken);
      clearAliasStorage();
      setToken(originalToken);
      setUser(data.user);
      router.push("/dashboard");
    } catch {
      clearSession();
      router.push("/login");
      throw new Error("Sessione originale scaduta, effettua di nuovo il login");
    }
  }, [clearAliasStorage, clearSession, router, token]);

  const logout = useCallback(() => {
    clearSession();
    router.push("/login");
  }, [clearSession, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        originalUser,
        isAliasing: Boolean(originalUser),
        isLoading,
        login,
        startAlias,
        exitAlias,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve essere usato all'interno di AuthProvider");
  }
  return context;
}
