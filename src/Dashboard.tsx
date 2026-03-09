import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { RecentActivity } from "./RecentActivity";
import { useState } from "react";
import { DebtManagementModal } from "./DebtManagementModal";
import { Id } from "../convex/_generated/dataModel";

export function Dashboard({ userId }: { userId: Id<"users"> }) {
  const patients = useQuery(api.patients.list, userId ? { userId } : "skip") || [];
  const todayIncome = useQuery(api.payments.getTodayIncome, { userId }) || 0;
  
  const [selectedPatientForDebt, setSelectedPatientForDebt] = useState<{ _id: Id<"patients">, name: string, debt: number } | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  const totalDebt = patients.reduce((sum, patient) => sum + (patient.debtStatus !== "cleared" ? Math.max(0, patient.debt) : 0), 0);
  
  const patientsWithDebt = patients
    .filter(p => p.debt > 0 && p.debtStatus !== "cleared")
    .sort((a, b) => b.debt - a.debt);

  const openDebtModal = (patient: any) => {
    setSelectedPatientForDebt({ _id: patient._id, name: patient.name, debt: patient.debt });
    setIsDebtModalOpen(true);
  };

  return (
    <div className="space-y-6 transition-colors duration-300 pb-12">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Income Card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-container shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center transition-all duration-300 h-full min-h-[160px]">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">סה"כ הכנסות היום</h3>
          <p className="text-4xl font-black text-green-600 dark:text-green-400">₪{todayIncome.toFixed(0)}</p>
        </div>

        {/* Total Open Debts Card - Detailed Breakdown */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-container shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col transition-all duration-300">
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">סה"כ חובות פתוחים</h3>
            <p className="text-4xl font-black text-red-600 dark:text-red-400">₪{totalDebt.toFixed(0)}</p>
          </div>

          <div className="border-t border-gray-50 dark:border-gray-800 pt-4">
            {patientsWithDebt.length > 0 ? (
              <div className="max-h-[200px] overflow-y-auto space-y-3 pr-1">
                {patientsWithDebt.map((p) => (
                  <div 
                    key={p._id} 
                    onClick={() => openDebtModal(p)}
                    className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 -mx-2 rounded-lg transition-all active:scale-95"
                  >
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{p.name}</span>
                    <span className="text-sm font-black text-red-600 dark:text-red-400">₪{p.debt.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">אין חובות פתוחים – הכל מעודכן!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <RecentActivity userId={userId} />

      <DebtManagementModal 
        isOpen={isDebtModalOpen} 
        onClose={() => setIsDebtModalOpen(false)} 
        patient={selectedPatientForDebt}
        userId={userId}
      />
    </div>
  );
}
