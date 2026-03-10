import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useMemo } from "react";
import { AddSessionModal } from "./AddSessionModal";
import { toast } from "sonner";

import { Id } from "../convex/_generated/dataModel";

type ActivityType = "treatment_income" | "debt_entry" | "debt_settlement";

type Activity = {
  id: string;
  type: ActivityType;
  date: string;
  timestamp: number; // For exact chronological sorting
  patientName: string;
  amount: number;
  treatmentType?: string;
  paymentMethod?: string;
  originalSession?: any;
  isPartialSettlement?: boolean;
  paymentId?: Id<"payments">;
  paymentType?: string; // "income" or "adjustment"
};

export function RecentActivity({ 
  userId, 
  sessions, 
  payments 
}: { 
  userId: Id<"users">,
  sessions: any[] | undefined,
  payments: any[] | undefined
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

  const removePayment = useMutation(api.payments.removePayment);
  const settleDebt = useMutation(api.payments.settlePatientDebt);

  const parseTreatmentType = (notes?: string) => {
    if (!notes) return "טיפול";
    const typeMatch = notes.match(/סוג טיפול: (.*?)(?: \||$)/);
    return typeMatch ? typeMatch[1] : "טיפול";
  };

  const handleCancelSessionDebt = async (e: React.MouseEvent, activity: Activity) => {
    e.stopPropagation();
    if (confirm(`האם לבטל את החוב עבור הטיפול של ${activity.patientName}?`)) {
      try {
        await settleDebt({
          userId,
          patientId: activity.originalSession.patientId,
          sessionId: activity.originalSession._id,
          amount: activity.amount
        });
        toast.success("החוב בוטל בהצלחה");
      } catch (error: any) {
        toast.error("ביטול החוב נכשל");
      }
    }
  };

  const groupedActivities = useMemo(() => {
    if (!sessions || !payments) return {};

    // Process activities
    const allActivities: Activity[] = [];

    // 1. Process Sessions (for Debt Entry)
    sessions.forEach(session => {
      if (session && !session.isPaid) {
        allActivities.push({
          id: `debt-entry-${session._id}`,
          type: "debt_entry",
          date: session.date,
          timestamp: (session as any)._creationTime,
          patientName: session.patientName,
          amount: (session.cost || 0) - ((session as any).paymentAmount || 0),
          treatmentType: parseTreatmentType(session.notes),
          originalSession: session
        });
      }
    });

    // 2. Process Payments (for Income or Settlement)
    payments.forEach(payment => {
      if (!payment || payment.isDeleted || payment.isWriteOff) return;

      const linkedSession = sessions.find(s => s._id === payment.sessionId);
      
      // If adjustment is linked to a session, but that session is deleted, do not show it
      if (payment.type === "adjustment" && (!linkedSession || linkedSession.isDeleted)) {
        return;
      }

      if (payment.type === "income" && linkedSession) {
        // New Treatment Income
        allActivities.push({
          id: `treatment-income-${payment._id}`,
          type: "treatment_income",
          date: payment.date,
          timestamp: (payment as any)._creationTime,
          patientName: payment.patientName,
          amount: payment.amount,
          treatmentType: parseTreatmentType(linkedSession.notes),
          paymentMethod: payment.method,
          originalSession: linkedSession,
          paymentId: payment._id
        });
      } else {
        // Debt Settlement or Adjustment (this now catches adjustments even if they have a sessionId)
        const isPartial = payment.notes?.includes("חלקית");
        allActivities.push({
          id: `debt-settlement-${payment._id}`,
          type: "debt_settlement",
          date: payment.date,
          timestamp: (payment as any)._creationTime,
          patientName: payment.patientName,
          amount: payment.amount,
          paymentMethod: payment.method,
          isPartialSettlement: isPartial,
          paymentId: payment._id,
          paymentType: (payment as any).type || "income",
          originalSession: linkedSession // Still link it if it exists for modal support
        });
      }
    });

    // Sort by timestamp descending (most recent first) across all types
    allActivities.sort((a, b) => b.timestamp - a.timestamp);

    // Group by date
    const grouped: { [key: string]: Activity[] } = {};
    allActivities.slice(0, 15).forEach(activity => {
      if (!grouped[activity.date]) {
        grouped[activity.date] = [];
      }
      grouped[activity.date].push(activity);
    });

    return grouped;
  }, [sessions, payments]);

  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    const [year, month, day] = dateStr.split("-");
    const formattedDate = `${day}/${month}`;

    if (dateStr === today) return `היום - ${formattedDate}`;
    if (dateStr === yesterday) return `אתמול - ${formattedDate}`;
    
    const hebDays = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'", "יום ו'", "שבת"];
    const dayOfWeek = hebDays[new Date(dateStr).getDay()];
    return `${dayOfWeek} - ${formattedDate}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const handleRowClick = (activity: Activity) => {
    if (activity.originalSession) {
      setEditingSession(activity.originalSession);
      setIsModalOpen(true);
    }
  };

  const handleDeletePayment = async (e: React.MouseEvent, paymentId: Id<"payments">) => {
    e.stopPropagation();
    if (confirm("האם למחוק את תיעוד התשלום?")) {
      try {
        await removePayment({ paymentId, userId });
        toast.success("התשלום נמחק בהצלחה");
      } catch (error: any) {
        toast.error("מחיקת התשלום נכשלה");
      }
    }
  };

  return (
    <div className="space-y-4 transition-colors duration-300">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">פעילות אחרונה</h3>
      </div>

      {Object.keys(groupedActivities).length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-container p-8 text-center border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 font-medium">אין פעילות אחרונה</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute right-[15px] top-2 bottom-2 w-[1px] bg-gray-100 dark:bg-gray-800" />

          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([date, activities]) => (
              <div key={date} className="relative">
                {/* Date Header */}
                <div className="relative z-10 flex items-center mb-4">
                  <div className="w-[32px] h-[32px] flex items-center justify-center mr-[-16px] ml-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-gray-50 dark:border-black" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-black px-2 py-0.5 rounded">
                    {formatDateHeader(date)}
                  </span>
                </div>

                {/* Activity Rows */}
                <div className="space-y-4 pr-8">
                  {activities.map((activity) => (
                    <div 
                      key={activity.id}
                      onClick={() => handleRowClick(activity)}
                      className="flex items-center justify-between group cursor-pointer active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          activity.type === "treatment_income" 
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" 
                            : activity.type === "debt_entry"
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : activity.paymentType === "adjustment"
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                        }`}>
                          {activity.type === "treatment_income" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                          ) : activity.type === "debt_entry" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="14" x2="12" y2="14"/></svg>
                          ) : activity.paymentType === "adjustment" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
                          )}
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-2">
                            <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                              {activity.patientName}
                            </p>
                            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">
                              {formatTime(activity.timestamp)}
                            </span>
                          </div>
                          <p className="text-[12px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                            {activity.type === "treatment_income" && (
                              <>{activity.treatmentType} <span className="mx-1">•</span> {activity.paymentMethod}</>
                            )}
                            {activity.type === "debt_entry" && (
                              <>{activity.treatmentType}</>
                            )}
                            {activity.type === "debt_settlement" && (
                              <>{activity.paymentType === "adjustment" ? "ביטול חוב" : (activity.isPartialSettlement ? "סגירת חוב חלקית" : "סגירת חוב")} <span className="mx-1">•</span> {activity.paymentMethod}</>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <span className={`text-[16px] font-black ${
                            activity.type === "debt_entry" 
                              ? "text-red-600 dark:text-red-400" 
                              : activity.paymentType === "adjustment"
                              ? "text-blue-600 dark:text-blue-500"
                              : "text-green-600 dark:text-green-400"
                          }`}>
                            {activity.type === "debt_entry" ? "" : (activity.paymentType === "adjustment" ? "" : "+")}₪{activity.amount.toFixed(0)}
                          </span>
                        </div>
                        
                        {activity.type === "debt_entry" && (
                          <button
                            onClick={(e) => handleCancelSessionDebt(e, activity)}
                            className="p-1.5 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="ביטול חוב לטיפול זה"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          </button>
                        )}

                        {activity.paymentId && (
                          <button
                            onClick={(e) => handleDeletePayment(e, activity.paymentId!)}
                            className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="מחיקת תשלום"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddSessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingSession={editingSession}
        userId={userId}
      />
    </div>
  );
}
