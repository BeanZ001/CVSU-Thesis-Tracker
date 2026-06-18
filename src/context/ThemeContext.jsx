import { createContext, useContext, useEffect, useState } from "react";

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme    = (t) => setThemeState(t);
  const toggleTheme = () => setThemeState(prev => prev === "light" ? "dark" : "light");
  const resetTheme  = () => setThemeState("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
