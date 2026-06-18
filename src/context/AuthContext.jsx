
import { createContext, useState } from "react";

export const API_URL = "http://localhost/myapp/auth_api.php";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const login  = (userData) => setUser(userData);

  const logout = ()         => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
