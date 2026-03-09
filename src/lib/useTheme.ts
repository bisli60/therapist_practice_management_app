import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (currentTheme: Theme) => {
      root.classList.remove("light", "dark");
      root.classList.add(currentTheme);
      
      if (currentTheme === "dark") {
        root.style.colorScheme = "dark";
      } else {
        root.style.colorScheme = "light";
      }
    };

    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
