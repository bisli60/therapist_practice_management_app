import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useTheme, Theme } from "./lib/useTheme";
import { Id } from "../convex/_generated/dataModel";

type ModalType = "treatment" | "payment" | null;

interface SettingsPageProps {
  userId: Id<"users">;
  onLogout: () => void;
}

export function SettingsPage({ userId, onLogout }: SettingsPageProps) {
  const settings = useQuery(api.settings.get, userId ? { userId } : "skip");
  const updateSettings = useMutation(api.settings.update);
  const updateSecretCode = useMutation(api.users.updateSecretCode);
  const { theme, setTheme } = useTheme();

  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  
  // Password change state
  const [newSecretCode, setNewSecretCode] = useState("");
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Modal states
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalInputValue, setModalInputValue] = useState("");

  useEffect(() => {
    if (settings) {
      setTreatmentTypes(settings.treatmentTypes);
      setPaymentMethods(settings.paymentMethods);
    }
  }, [settings]);

  const saveSettings = async (newTypes: string[], newMethods: string[]) => {
    try {
      await updateSettings({
        userId,
        treatmentTypes: newTypes,
        paymentMethods: newMethods,
      });
    } catch (error) {
      toast.error("עדכון ההגדרות נכשל");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretCode.trim()) {
      toast.error("אנא הכניסי קוד סודי חדש");
      return;
    }

    setIsChangingPassword(true);
    try {
      await updateSecretCode({ userId, newSecretCode: newSecretCode.trim() });
      toast.success("הקוד הסודי עודכן בהצלחה");
      setNewSecretCode("");
      setShowSecretCode(false);
    } catch (error) {
      toast.error("עדכון הקוד הסודי נכשל");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Treatment Type Handlers
  const openTreatmentModal = (index: number | null = null) => {
    setEditingIndex(index);
    setModalInputValue(index !== null ? treatmentTypes[index] : "");
    setActiveModal("treatment");
  };

  const handleDeleteTreatment = (index: number) => {
    if (confirm("האם את בטוחה שברצונך למחוק סוג טיפול זה?")) {
      const updated = treatmentTypes.filter((_, i) => i !== index);
      setTreatmentTypes(updated);
      saveSettings(updated, paymentMethods);
      toast.success("סוג טיפול נמחק");
    }
  };

  // Payment Method Handlers
  const openPaymentModal = (index: number | null = null) => {
    setEditingIndex(index);
    setModalInputValue(index !== null ? paymentMethods[index] : "");
    setActiveModal("payment");
  };

  const handleDeletePayment = (index: number) => {
    if (confirm("האם את בטוחה שברצונך למחוק אמצעי תשלום זה?")) {
      const updated = paymentMethods.filter((_, i) => i !== index);
      setPaymentMethods(updated);
      saveSettings(treatmentTypes, updated);
      toast.success("אמצעי תשלום נמחק");
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalInputValue.trim()) return;

    if (activeModal === "treatment") {
      let updated = [...treatmentTypes];
      if (editingIndex !== null) {
        updated[editingIndex] = modalInputValue.trim();
        toast.success("סוג טיפול עודכן");
      } else {
        updated.push(modalInputValue.trim());
        toast.success("סוג טיפול נוסף");
      }
      setTreatmentTypes(updated);
      saveSettings(updated, paymentMethods);
    } else if (activeModal === "payment") {
      let updated = [...paymentMethods];
      if (editingIndex !== null) {
        updated[editingIndex] = modalInputValue.trim();
        toast.success("אמצעי תשלום עודכן");
      } else {
        updated.push(modalInputValue.trim());
        toast.success("אמצעי תשלום נוסף");
      }
      setPaymentMethods(updated);
      saveSettings(treatmentTypes, updated);
    }

    setActiveModal(null);
  };

  if (settings === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 transition-colors duration-300">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">הגדרות</h3>
      </div>

      {/* Theme Toggle Section */}
      <div className="bg-white dark:bg-gray-900 rounded-container shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="font-bold text-gray-700 dark:text-gray-300">ערכת נושא</h4>
        </div>
        <div className="p-6">
          <div className="flex bg-gray-100 dark:bg-black p-1 rounded-xl">
            {(["light", "dark"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
                  theme === t
                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {t === "light" ? "יום" : "לילה"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Treatment Types Section */}
      <div className="bg-white dark:bg-gray-900 rounded-container shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <h4 className="font-bold text-gray-700 dark:text-gray-300">סוגי טיפול</h4>
          <button
            onClick={() => openTreatmentModal()}
            className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-primary-hover transition-colors shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            הוספה
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {treatmentTypes.map((type, index) => (
            <div key={index} className="px-6 py-4 flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="font-medium text-gray-800 dark:text-gray-200">{type}</span>
              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openTreatmentModal(index)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="עריכה">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button onClick={() => handleDeleteTreatment(index)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" title="מחיקה">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="bg-white dark:bg-gray-900 rounded-container shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <h4 className="font-bold text-gray-700 dark:text-gray-300">אמצעי תשלום</h4>
          <button
            onClick={() => openPaymentModal()}
            className="text-sm bg-primary text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-primary-hover transition-colors shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            הוספה
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {paymentMethods.map((method, index) => (
            <div key={index} className="px-6 py-4 flex justify-between items-center group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="font-medium text-gray-800 dark:text-gray-200">{method}</span>
              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openPaymentModal(index)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" title="עריכה">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button onClick={() => handleDeletePayment(index)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" title="מחיקה">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Security Section */}
      <div className="bg-white dark:bg-gray-900 rounded-container shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="font-bold text-gray-700 dark:text-gray-300">אבטחת חשבון</h4>
        </div>
        <div className="p-6">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">קוד סודי חדש</label>
              <div className="relative">
                <input
                  type={showSecretCode ? "text" : "password"}
                  value={newSecretCode}
                  onChange={(e) => setNewSecretCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="הכניסי קוד חדש..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecretCode(!showSecretCode)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showSecretCode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isChangingPassword || !newSecretCode.trim()}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isChangingPassword ? "מעדכן..." : "עדכון קוד סודי"}
            </button>
          </form>
        </div>
      </div>

      {/* Logout Section */}
      <div className="pt-4">
        <button
          onClick={onLogout}
          className="w-full py-4 bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 font-bold rounded-container shadow-sm border border-gray-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-[0.99]"
        >
          התנתקות מהמערכת
        </button>
      </div>

      {/* Shared Modal for Treatment Types & Payment Methods */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div 
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setActiveModal(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-container shadow-2xl border border-gray-100 dark:border-gray-800 transform transition-all animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleModalSubmit} className="p-6 space-y-6 text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingIndex !== null ? "עריכת" : "הוספת"} {activeModal === "treatment" ? "סוג טיפול" : "אמצעי תשלום"}
              </h3>
              
              <div>
                <input
                  type="text"
                  autoFocus
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-center text-lg"
                  placeholder={activeModal === "treatment" ? "הכניסי שם טיפול..." : "הכניסי אמצעי תשלום..."}
                  required
                />
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="px-12 py-3 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-hover active:scale-95 transition-all"
                >
                  שמירה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
