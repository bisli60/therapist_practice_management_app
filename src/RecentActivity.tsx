import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { AddSessionModal } from "./AddSessionModal";

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
};

export function RecentActivity({ userId }: { userId: Id<"users"> }) {
  const sessions = useQuery(api.sessions.list, { userId }) || [];
  const payments = useQuery(api.payments.list, { userId }) || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

  const parseTreatmentType = (notes?: string) => {
    if (!notes) return "טיפול";
    const typeMatch = notes.match(/סוג טיפול: (.*?)(?: \||$)/);
    return typeMatch ? typeMatch[1] : "טיפול";
  };

  // Process activities
  const allActivities: Activity[] = [];

  // 1. Process Sessions (for Debt Entry)
  sessions.forEach(session => {
    if (!session.isPaid) {
      allActivities.push({
        id: `debt-entry-${session._id}`,
        type: "debt_entry",
        date: session.date,
        timestamp: (session as any)._creationTime,
        patientName: session.patientName,
        amount: session.cost - ((session as any).paymentAmount || 0),
        treatmentType: parseTreatmentType(session.notes),
        originalSession: session
      });
    }
  });

  // 2. Process Payments (for Income or Settlement)
  payments.forEach(payment => {
    if (payment.isWriteOff) return;

    const linkedSession = sessions.find(s => s.paymentId === payment._id);
    
    if (linkedSession) {
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
        originalSession: linkedSession
      });
    } else {
      // Debt Settlement
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
      });
    }
  });

  // Sort by timestamp descending (most recent first) across all types
  allActivities.sort((a, b) => b.timestamp - a.timestamp);

  // Group by date
  const groupedActivities: { [key: string]: Activity[] } = {};
  allActivities.slice(0, 15).forEach(activity => {
    if (!groupedActivities[activity.date]) {
      groupedActivities[activity.date] = [];
    }
    groupedActivities[activity.date].push(activity);
  });

  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    const [year, month, day] = dateStr.split("-");
    const formattedDate = `${day}/${month}`;

    if (dateStr === today) return `היום - ${formattedDate}`;
    if (dateStr === yesterday) return `אתמול - ${formattedDate}`;
    
    const days = ["יום א'", "יום ב'", "יום ג'", "יום ד'", "יום ה'", "יום ו'", "שבת"];
    const dayOfWeek = days[new Date(dateStr).getDay()];
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

  return (
    <div className="space-y-4 transition-colors duration-300">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">פעילות אחרונה</h3>
      </div>

      {Object.keys(groupedActivities).length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-container p-8 text-center border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 font-medium">אין פעילות פיננסית מתועדת לימים אלו.</p>
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
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                        }`}>
                          {activity.type === "treatment_income" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                          ) : activity.type === "debt_entry" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="14" x2="12" y2="14"/></svg>
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
                              <>{activity.isPartialSettlement ? "סגירת חוב חלקית" : "סגירת חוב"} <span className="mx-1">•</span> {activity.paymentMethod}</>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-left">
                        <span className={`text-[16px] font-black ${
                          activity.type === "debt_entry" 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-green-600 dark:text-green-400"
                        }`}>
                          {activity.type === "debt_entry" ? "" : "+"}₪{activity.amount.toFixed(0)}
                        </span>
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
