import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";
import { AddSessionModal } from "./AddSessionModal";

export function AddSession() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  
  const sessions = useQuery(api.sessions.list, {}) || [];
  const removeSession = useMutation(api.sessions.remove);

  // Long press & Context Menu state
  const [activeMenuId, setActiveMenuId] = useState<Id<"sessions"> | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [pressingId, setPressingId] = useState<Id<"sessions"> | null>(null);

  const startEdit = (session: any) => {
    setEditingSession(session);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: Id<"sessions">) => {
    if (confirm("האם את בטוחה שברצונך למחוק את הטיפול?")) {
      try {
        await removeSession({ sessionId: id });
        toast.success("הטיפול נמחק בהצלחה");
      } catch (error) {
        toast.error("מחיקת הטיפול נכשלה");
      }
    }
    setActiveMenuId(null);
  };

  const parseNotes = (notes?: string) => {
    if (!notes) return { type: "טיפול", pureNotes: "" };
    const typeMatch = notes.match(/סוג טיפול: (.*?)(?: \||$)/);
    const pureNotes = notes.split(" | ")[1] || "";
    return { type: typeMatch ? typeMatch[1] : "טיפול", pureNotes };
  };

  const startPress = (id: Id<"sessions">) => {
    setPressingId(id);
    const timer = window.setTimeout(() => {
      setActiveMenuId(id);
      setPressingId(null);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 600);
    setLongPressTimer(timer);
  };

  const endPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setPressingId(null);
  };

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId]);

  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: typeof sessions } = {};
    
    // Sort all sessions by startTime newest first
    const sortedSessions = [...sessions].sort((a, b) => b.startTime - a.startTime);

    sortedSessions.forEach(session => {
      const dateKey = session.date; // Use the date string as key
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [sessions]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const dateFormatted = date.toLocaleDateString('he-IL', options);

    if (dateStr === todayStr) return `היום - ${dateFormatted}`;
    if (dateStr === yesterdayStr) return `אתמול - ${dateFormatted}`;

    const dayName = date.toLocaleDateString('he-IL', { weekday: 'long' });
    return `${dayName}, ${dateFormatted}`;
  };

  return (
    <div className="space-y-6 pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">ניהול טיפולים</h3>
      </div>

      {/* List View with Grouping */}
      <div className="space-y-8 relative">
        {groupedSessions.length > 0 ? (
          groupedSessions.map(([dateKey, groupSessions]) => (
            <div key={dateKey} className="space-y-4 relative">
              {/* Sticky Date Header */}
              <div className="sticky top-0 z-20 py-2 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md -mx-4 px-8 transition-colors duration-300">
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {formatDateHeader(dateKey)}
                </h4>
              </div>

              {/* Group Content with Timeline Line */}
              <div className="relative pr-6 mr-4">
                {/* Vertical Timeline Line */}
                <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-slate-200 dark:bg-slate-800 z-0" />
                
                <div className="space-y-4">
                  {groupSessions.map((session, index) => {
                    const { type } = parseNotes(session.notes);
                    return (
                      <div 
                        key={session._id} 
                        onMouseDown={() => startPress(session._id)}
                        onMouseUp={endPress}
                        onMouseLeave={endPress}
                        onTouchStart={() => startPress(session._id)}
                        onTouchEnd={endPress}
                        onClick={() => !activeMenuId && startEdit(session)}
                        className={`relative p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none border-none transition-all duration-300 select-none cursor-pointer z-10 ${
                          pressingId === session._id ? "scale-[0.98] bg-slate-50 dark:bg-slate-800" : ""
                        }`}
                      >
                        {/* Timeline Dot */}
                        <div className="absolute top-1/2 -right-[27px] -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-950 z-20" />

                        {/* More Actions Icon */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === session._id ? null : session._id);
                          }}
                          className="absolute top-3 left-3 p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>

                        <div className="flex flex-col gap-3">
                          {/* Header Row */}
                          <div className="flex justify-between items-start pl-8">
                            <div>
                              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                {session.patientName}
                              </h4>
                              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                                {new Date(session.startTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-4 items-center pt-2 border-t border-slate-50 dark:border-slate-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-primary bg-primary/5 dark:bg-primary/10 px-2 py-1 rounded-lg">
                                {type}
                              </span>
                            </div>

                            <div className="flex flex-col items-end">
                              <span className={`text-lg font-black leading-none ${session.isPaid ? 'text-emerald-500' : 'text-slate-900 dark:text-slate-200'}`}>
                                ₪{(session as any).paymentAmount?.toLocaleString() || "0"}
                              </span>
                              <span className={`text-[8px] font-black uppercase tracking-wider mt-1.5 px-1.5 py-0.5 rounded-md ${session.isPaid ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {session.isPaid ? "שולם" : "חלק מהחוב"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Floating Context Menu */}
                        {activeMenuId === session._id && (
                          <div 
                            className="absolute top-12 left-4 w-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-1.5 flex flex-col gap-1">
                              <button 
                                onClick={() => startEdit(session)}
                                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                              >
                                עריכה
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                              </button>
                              <div className="h-[1px] bg-slate-100 dark:bg-slate-700/50 mx-1" />
                              <button 
                                onClick={() => handleDelete(session._id)}
                                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                              >
                                מחיקה
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">
                עדיין לא תועדו טיפולים.
              </p>
              <p className="text-slate-400 dark:text-slate-500 font-medium text-xs">
                הטיפול הראשון שלך יופיע כאן.
              </p>
            </div>
          </div>
        )}
      </div>

      <AddSessionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingSession={editingSession}
      />
    </div>
  );
}
