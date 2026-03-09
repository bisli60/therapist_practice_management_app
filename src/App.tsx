import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { Dashboard } from "./Dashboard";
import { useState, useEffect } from "react";
import { AddSession } from "./AddSession";
import { PatientList } from "./PatientList";
import { SettingsPage } from "./SettingsPage";
import { ReportsPage } from "./ReportsPage";
import { FloatingAddButton } from "./FloatingAddButton";
import { useTheme } from "./lib/useTheme";
import { Auth } from "./Auth";
import { Id } from "../convex/_generated/dataModel";

export type Tab = "home" | "treatments" | "patients" | "reports" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [userId, setUserId] = useState<Id<"users"> | null>(() => {
    return (localStorage.getItem("userId") as Id<"users">) || null;
  });
  
  useTheme(); // Initialize theme logic

  const handleLogin = (id: Id<"users">) => {
    setUserId(id);
    localStorage.setItem("userId", id);
  };

  const handleLogout = () => {
    setUserId(null);
    localStorage.removeItem("userId");
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] dark:bg-black transition-colors duration-500">
        <Auth onLogin={handleLogin} />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd] dark:bg-black pb-20 transition-colors duration-500">
      <div className="bg-primary text-white p-1 text-[8px] text-center">App Loaded</div>
      <main className="flex-1 p-4 pt-8">
        <Content activeTab={activeTab} userId={userId} onLogout={handleLogout} />
      </main>

      <FloatingAddButton userId={userId} />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t-[0.5px] border-slate-200 dark:border-slate-800 shadow-top pb-[env(safe-area-inset-bottom)] h-[calc(64px+env(safe-area-inset-bottom))] flex items-center justify-around px-2 transition-all duration-500">
        <NavButton
          active={activeTab === "home"}
          onClick={() => setActiveTab("home")}
          label="בית"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          }
        />
        <NavButton
          active={activeTab === "treatments"}
          onClick={() => setActiveTab("treatments")}
          label="טיפולים"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          }
        />
        <NavButton
          active={activeTab === "patients"}
          onClick={() => setActiveTab("patients")}
          label="מטופלות"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          }
        />
        <NavButton
          active={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
          label="דוחות"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          }
        />
        <NavButton
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
          label="הגדרות"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        />
      </nav>
      <Toaster />
    </div>
  );
}

function Content({ activeTab, userId, onLogout }: { activeTab: Tab, userId: Id<"users">, onLogout: () => void }) {
  const patients = useQuery(api.patients.list, userId ? { userId } : "skip");

  if (patients === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {activeTab === "home" && <Dashboard userId={userId} />}
      {activeTab === "treatments" && <AddSession userId={userId} />}
      {activeTab === "patients" && <PatientList patients={patients || []} showActions userId={userId} />}
      {activeTab === "reports" && <ReportsPage userId={userId} />}
      {activeTab === "settings" && <SettingsPage userId={userId} onLogout={onLogout} />}
      {activeTab === "payments" && <AddPayment userId={userId} />}
    </div>
  );
}

function NavButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 ${
        active ? "text-primary dark:text-white scale-110" : "text-slate-400 dark:text-slate-500"
      }`}
    >
      <div className={`transition-all duration-300 ${active ? "opacity-100" : "opacity-100"}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${active ? "opacity-100" : "opacity-0 h-0"}`}>
        {label}
      </span>
    </button>
  );
}
