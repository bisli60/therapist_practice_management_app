import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { AddPatient } from "./AddPatient";
import { DebtManagementModal } from "./DebtManagementModal";
import { AddPatientModal } from "./AddPatientModal";
import { toast } from "sonner";

interface Patient {
  _id: Id<"patients">;
  name: string;
  email?: string;
  phone?: string;
  sessionRate: number;
  totalSessions: number;
  totalSessionCost: number;
  totalPayments: number;
  debt: number;
  notes?: string;
  debtStatus?: string;
}

interface PatientListProps {
  patients: Patient[];
  showActions?: boolean;
  userId: Id<"users">;
}

export function PatientList({ patients, showActions = false, userId }: PatientListProps) {
  const [selectedPatientForDebt, setSelectedPatientForDebt] = useState<{ _id: Id<"patients">, name: string, debt: number } | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Menu states
  const [activeMenuPatientId, setActiveMenuPatientId] = useState<Id<"patients"> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  
  const removePatient = useMutation(api.patients.remove);

  const openDebtModal = (patient: Patient) => {
    setSelectedPatientForDebt({ _id: patient._id, name: patient.name, debt: patient.debt });
    setIsDebtModalOpen(true);
  };

  const handleEdit = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsEditModalOpen(true);
    setActiveMenuPatientId(null);
  };

  const handleDelete = async (patient: Patient) => {
    if (confirm(`האם למחוק את המטופלת ${patient.name}? פעולה זו תמחק גם את כל היסטוריית הטיפולים שלה.`)) {
      try {
        await removePatient({ patientId: patient._id });
        toast.success("המטופלת נמחקה בהצלחה");
      } catch (error) {
        toast.error("מחיקת המטופלת נכשלה");
      }
    }
    setActiveMenuPatientId(null);
  };

  const filteredPatients = patients
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));

  // Long press handling
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [pressingPatientId, setPressingPatientId] = useState<Id<"patients"> | null>(null);

  const startPress = (id: Id<"patients">) => {
    setPressingPatientId(id);
    const timer = window.setTimeout(() => {
      setActiveMenuPatientId(id);
      setPressingPatientId(null);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
    setLongPressTimer(timer);
  };

  const endPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressingPatientId(null);
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuPatientId(null);
    if (activeMenuPatientId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuPatientId]);

  return (
    <div className="space-y-6 pb-12 transition-colors duration-300">
      {showActions && <AddPatient userId={userId} />}

      {/* Search Bar */}
      <div className="relative mx-1">
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חיפוש מטופלת לפי שם..."
          className="block w-full pr-11 pl-10 py-3.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-container text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {filteredPatients.map((patient) => (
          <div 
            key={patient._id} 
            onMouseDown={() => startPress(patient._id)}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={() => startPress(patient._id)}
            onTouchEnd={endPress}
            className={`relative mx-1 p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-container shadow-sm transition-all duration-300 select-none ${
              patient.debtStatus === "cleared" ? "opacity-60" : ""
            } ${pressingPatientId === patient._id ? "scale-[0.98] bg-gray-50 dark:bg-gray-800" : ""}`}
          >
            {/* Context Menu Icon */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuPatientId(activeMenuPatientId === patient._id ? null : patient._id);
              }}
              className="absolute top-2 left-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>

            {/* Top Row: Info & Balance */}
            <div className="flex justify-between items-start mb-2 pl-6">
              <div className="flex items-center gap-2">
                <div 
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    patient.debtStatus === "cleared" || patient.debt === 0
                      ? "bg-gray-300 dark:bg-gray-600"
                      : patient.debtStatus === "paid" || patient.debt < 0
                      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                      : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  }`}
                />
                <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                  {patient.name}
                </h4>
              </div>
              
              <div className="text-left">
                <span
                  className={`text-lg font-black ${
                    patient.debtStatus === "cleared"
                      ? "text-gray-400 dark:text-gray-600 line-through"
                      : patient.debt > 0
                      ? "text-red-600 dark:text-red-400"
                      : patient.debt < 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-900 dark:text-gray-200"
                  }`}
                >
                  {patient.debt > 0 && patient.debtStatus !== "cleared" ? "" : patient.debt < 0 ? "+" : ""}₪
                  {Math.abs(patient.debt).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Middle Row: Notes */}
            {patient.notes && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {patient.notes}
                </p>
              </div>
            )}

            {/* Bottom Row: Action */}
            {patient.debt > 0 && patient.debtStatus !== "cleared" && (
              <div className="pt-2 border-t border-gray-50 dark:border-gray-800/50 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDebtModal(patient);
                  }}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold bg-red-50/50 dark:bg-red-900/10 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95 border border-red-100/50 dark:border-red-900/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  ניהול חוב
                </button>
              </div>
            )}

            {patient.debtStatus === "cleared" && (
              <div className="mt-2 text-center">
                <span className="text-[10px] uppercase tracking-wider font-black text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-1 rounded-full">
                  חוב נמחק
                </span>
              </div>
            )}

            {/* Floating Quick Actions Menu */}
            {activeMenuPatientId === patient._id && (
              <div 
                className="absolute top-10 left-4 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1.5 flex flex-col gap-1">
                  <button 
                    onClick={() => handleEdit(patient)}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                  >
                    עריכת פרטים
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <div className="h-[1px] bg-gray-100 dark:bg-gray-700 mx-1" />
                  <button 
                    onClick={() => handleDelete(patient)}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    מחיקת מטופלת
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredPatients.length === 0 && patients.length > 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-bold">
            לא נמצאה מטופלת בשם זה.
          </div>
        )}
        
        {patients.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            לא נמצאו מטופלות. הוסף את המטופלת הראשונה שלך כדי להתחיל.
          </div>
        )}
      </div>

      <DebtManagementModal 
        isOpen={isDebtModalOpen} 
        onClose={() => setIsDebtModalOpen(false)} 
        patient={selectedPatientForDebt}
        userId={userId}
      />

      <AddPatientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setPatientToEdit(null);
        }}
        editingPatient={patientToEdit}
        userId={userId}
      />
    </div>
  );
}
