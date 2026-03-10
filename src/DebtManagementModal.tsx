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
  
  const createPayment = useMutation(api.payments.createAndLinkToOldestUnpaid);
  const settleDebt = useMutation(api.payments.settlePatientDebt);
  const updateDebtStatus = useMutation(api.patients.updateDebtStatus);
  const settings = useQuery(api.settings.get, userId ? { userId } : "skip");

  useEffect(() => {
    if (isOpen && patient) {
      console.log(`DebtManagementModal: Viewing debt for ${patient.name}, current debt: ${patient.debt}`);
    }
  }, [isOpen, patient]);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handleSettleDebt = async () => {
    if (confirm(`האם למחוק את החוב של ${patient.name}? פעולה זו תבטל את יתרת החוב מבלי להחשיב זאת כהכנסה.`)) {
      try {
        await settleDebt({
          userId,
          patientId: patient._id
        });
        toast.success("החוב נמחק בהצלחה");
        onClose();
      } catch (error) {
        toast.error("מחיקת החוב נכשלה");
      }
    }
  };

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

      // Update debt status based on the payment
      await updateDebtStatus({
        userId,
        patientId: patient._id,
        status: isFullPayment ? "paid" : "partial"
      });

      toast.success("התשלום עודכן בהצלחה");
      onClose();
    } catch (error) {
      toast.error("עדכון התשלום נכשל");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-container shadow-2xl border border-gray-100 dark:border-gray-800 transform transition-all animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto">
        <div className="p-5 space-y-5">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              ניהול חוב ל{patient.name}
            </h3>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/10 rounded-full border border-red-100 dark:border-red-900/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">חוב:</span>
              <span className="text-xs font-black text-red-600 dark:text-red-400">₪{patient.debt.toFixed(0)}</span>
            </div>
          </div>
          
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-center">
                סכום שהתקבל
              </label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none text-lg font-light">₪</span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || parseFloat(val) >= 0) {
                      setAmount(val);
                    }
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/30 dark:bg-black text-gray-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-center text-xl font-black shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 px-1">
                אמצעי תשלום
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/10 outline-none transition-all text-xs font-bold"
              >
                {settings?.paymentMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={!amount}
                className={`w-full py-2.5 font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg text-sm ${
                  !amount
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none" 
                    : "bg-primary text-white hover:bg-primary-hover shadow-primary/20"
                }`}
              >
                אישור תשלום
              </button>

              <button
                type="button"
                onClick={handleSettleDebt}
                className="w-full py-2 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500 transition-all active:scale-[0.98] border border-slate-100 dark:border-slate-800/50"
              >
                ביטול/מחיקת יתרת החוב
              </button>
            </div>
          </form>

          <div className="text-center pt-1 border-t border-gray-50 dark:border-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors font-bold uppercase tracking-widest"
            >
              סגירה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
