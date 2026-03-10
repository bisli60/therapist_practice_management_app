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
  const [sortBy, setSortBy] = useState<"name" | "debt">("name");
  
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
        await removePatient({ patientId: patient._id, userId });
        toast.success("המטופלת נמחקה בהצלחה");
      } catch (error: any) {
        console.error("Error deleting patient:", error);
        toast.error(`מחיקת המטופלת נכשלה: ${error.message || "שגיאה לא ידועה"}`);
      }
    }
    setActiveMenuPatientId(null);
  };

  const filteredPatients = patients
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .sort((a, b) => {
      if (sortBy === "debt") {
        return b.debt - a.debt;
      }
      return a.name.localeCompare(b.name, "he");
    });

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

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 px-1">
        <div className="relative flex-1">
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
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-container w-full sm:w-auto">
          <button
            onClick={() => setSortBy("debt")}
            className={`flex-1 sm:px-4 py-2 text-sm font-bold rounded-r-card transition-all ${
              sortBy === "debt" 
                ? "bg-white dark:bg-gray-900 shadow-sm text-primary dark:text-white" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            לפי חוב
          </button>
          <button
            onClick={() => setSortBy("name")}
            className={`flex-1 sm:px-4 py-2 text-sm font-bold rounded-l-card transition-all ${
              sortBy === "name" 
                ? "bg-white dark:bg-gray-900 shadow-sm text-primary dark:text-white" 
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            לפי שם
          </button>
        </div>
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
            className={`relative mx-1 p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-container shadow-sm transition-all duration-300 select-none flex flex-col justify-center min-h-[80px] ${
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

            {/* Top Row: Info & Balance Status */}
            <div className="flex justify-between items-center pl-6">
              <div className="flex items-center gap-2">
                <div 
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    patient.debtStatus === "cleared"
                      ? "bg-gray-300 dark:bg-gray-600"
                      : patient.debt > 0
                      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                      : patient.debt < 0
                      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                  {patient.name}
                </h4>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-left flex flex-col items-end justify-center">
                  {patient.debtStatus === "cleared" ? (
                    null
                  ) : patient.debt === 0 ? (
                    null
                  ) : patient.debt > 0 ? (
                    <div className="flex flex-col items-end justify-center">
                      <span className="text-lg font-black text-red-600 dark:text-red-400 leading-none">
                        -₪{Math.abs(patient.debt).toFixed(0)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end justify-center">
                      <span className="text-lg font-black text-green-600 dark:text-green-400 leading-none">
                        +₪{Math.abs(patient.debt).toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Row: Notes */}
            {patient.notes && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {patient.notes}
                </p>
              </div>
            )}

            {/* Floating Quick Actions Menu */}
            {activeMenuPatientId === patient._id && (
              <div 
                className="absolute top-10 left-4 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1.5 flex flex-col gap-1">
                  {patient.debt > 0 && patient.debtStatus !== "cleared" && (
                    <>
                      <button 
                        onClick={() => {
                          openDebtModal(patient);
                          setActiveMenuPatientId(null);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        ניהול חוב
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15h2m-2-4h2m-2-4h2M9 21h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z"/></svg>
                      </button>
                      <div className="h-[1px] bg-gray-100 dark:bg-gray-700 mx-1" />
                    </>
                  )}
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
