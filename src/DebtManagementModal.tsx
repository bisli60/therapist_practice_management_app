import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

interface DebtManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    _id: Id<"patients">;
    name: string;
    debt: number;
  } | null;
  userId: Id<"users">;
}

export function DebtManagementModal({ isOpen, onClose, patient, userId }: DebtManagementModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  const createPayment = useMutation(api.payments.create);
  const updateDebtStatus = useMutation(api.patients.updateDebtStatus);
  const settings = useQuery(api.settings.get, userId ? { userId } : "skip");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);
    
    if (isNaN(payAmount) || payAmount <= 0) {
      toast.error("אנא הכניסי סכום תקין");
      return;
    }

    try {
      const isFullPayment = payAmount >= patient.debt;
      
      await createPayment({
        userId,
        patientId: patient._id,
        amount: payAmount,
        date: new Date().toISOString().split("T")[0],
        method: method,
        notes: isFullPayment ? "סגירת חוב" : "סגירת חוב חלקית",
      });

      // If full debt is covered, update status to paid
      if (isFullPayment) {
        await updateDebtStatus({
          userId,
          patientId: patient._id,
          status: "paid"
        });
      } else {
        await updateDebtStatus({
          userId,
          patientId: patient._id,
          status: "partial"
        });
      }

      toast.success("התשלום עודכן בהצלחה");
      onClose();
    } catch (error) {
      toast.error("עדכון התשלום נכשל");
    }
  };

  const handleClearDebt = async () => {
    if (confirm(`האם את בטוחה שברצונך למחוק את החוב של ${patient.name}?`)) {
      try {
        await updateDebtStatus({
          userId,
          patientId: patient._id,
          status: "cleared"
        });
        toast.success("החוב נמחק בהצלחה");
        onClose();
      } catch (error) {
        toast.error("מחיקת החוב נכשלה");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-container shadow-2xl border border-gray-100 dark:border-gray-800 transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              ניהול חוב: {patient.name}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 font-bold mt-1">
              יתרת חוב נוכחית: ₪{patient.debt.toFixed(2)}
            </p>
          </div>
          
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                סכום שהתקבל (₪)
              </label>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all text-center text-xl font-black"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                אמצעי תשלום
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
              >
                {settings?.paymentMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!amount}
              className={`w-full py-3 font-bold rounded-lg transition-all active:scale-95 shadow-lg ${
                !amount
                  ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" 
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              אישור תשלום
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">או</span>
            </div>
          </div>

          <button
            onClick={handleClearDebt}
            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all active:scale-95 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
          >
            מחיקת חוב (ללא תשלום)
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
