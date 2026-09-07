import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, obj = user
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("omnis_token");
    if (!token) {
      setUser(false);
      setReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem("omnis_token");
        setUser(false);
      })
      .finally(() => setReady(true));
  }, []);

  const authenticate = (token, u) => {
    localStorage.setItem("omnis_token", token);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("omnis_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, ready, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
