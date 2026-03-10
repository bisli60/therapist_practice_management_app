import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

export function ExpensesPage({ userId }: { userId: Id<"users"> }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [editingId, setEditingId] = useState<Id<"featureRequests"> | null>(null);
  const [editMessage, setEditMessage] = useState("");
  
  const addRequest = useMutation(api.requests.add);
  const removeRequest = useMutation(api.requests.remove);
  const updateRequest = useMutation(api.requests.update);
  const requests = useQuery(api.requests.list);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await addRequest({ userId, message });
      setMessage("");
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 2500);
    } catch (error) {
      toast.error("שגיאה בשליחת ההודעה.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"featureRequests">) => {
    if (!window.confirm("אמא, את בטוחה שברצונך למחוק את ההודעה הזו?")) {
      return;
    }
    try {
      await removeRequest({ id, userId });
      toast.success("ההודעה נמחקה.");
    } catch (error) {
      toast.error("שגיאה במחיקת ההודעה.");
    }
  };

  const handleStartEdit = (req: any) => {
    setEditingId(req._id);
    setEditMessage(req.message || "");
  };

  const handleUpdate = async () => {
    if (!editingId || !editMessage.trim()) return;
    try {
      await updateRequest({ id: editingId, userId, message: editMessage });
      setEditingId(null);
      toast.success("ההודעה עודכנה.");
    } catch (error) {
      toast.error("שגיאה בעדכון ההודעה.");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Premium Construction Header */}
      <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 shadow-2xl px-8 pb-8 pt-16 text-center transition-all duration-500 group">
        
        {/* Animated Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 blur-3xl rounded-full animate-pulse delay-700"></div>

        {/* Icon with Floating Animation */}
        <div className="relative mb-10 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-float-contained">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          
          <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter shadow-sm">
            In Development
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            הוצאות עסק
          </h2>
          <div className="h-1 w-12 bg-blue-500 mx-auto rounded-full"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed">
            אמא היקרה, המודול הזה נמצא כרגע בפיתוח. בקרוב מאוד תוכלי לנהל כאן את כל ההוצאות בצורה מקצועית.
          </p>
        </div>
      </div>

      {/* Message System */}
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            הצעות ובקשות לפיתוח
          </h3>
          
          <div className="flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="אמא, מה היית רוצה שיהיה בעמוד הזה? הקלידי כאן..."
                className="w-full min-h-[100px] p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all resize-none"
              />
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className={`
                  relative overflow-hidden w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
                  text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 
                  transition-all active:scale-[0.96] group
                `}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>שולח...</span>
                    </>
                  ) : (
                    <>
                      <span>שלחי הודעה</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="18" height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300"
                      >
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    </>
                  )}
                </div>
                {isSubmitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Requests Feed */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">
            הודעות ובקשות
          </h4>
          
          <div className="space-y-3">
            {requests?.map((req) => (
              <div 
                key={req._id}
                className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 group/msg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      {req.userEmail}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                  
                  {req.userId === userId && !editingId && (
                    <div className="flex items-center gap-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleStartEdit(req)}
                        className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                        title="ערוך הודעה"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(req._id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="מחק הודעה"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  )}
                </div>

                {editingId === req._id ? (
                  <div className="space-y-3 mt-2">
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="w-full min-h-[80px] p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-500 outline-none text-sm transition-all resize-none shadow-inner"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setEditingId(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5"
                      >
                        ביטול
                      </button>
                      <button 
                        onClick={handleUpdate}
                        className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20"
                      >
                        שמור שינויים
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    {req.message && (
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                        {req.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {requests?.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-sm italic">
                עוד אין הודעות... תהיי הראשונה לכתוב!
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-contained {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float-contained {
          animation: float-contained 3s ease-in-out infinite;
        }
        @keyframes plane-takeoff {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          20% { transform: translate(-5px, 5px) rotate(-5deg) scale(1.1); }
          100% { transform: translate(300px, -300px) rotate(15deg) scale(0.5); opacity: 0; }
        }
        .animate-plane-takeoff {
          animation: plane-takeoff 2s ease-in-out forwards;
        }
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />

      {/* Success Animation Modal */}
      {showSuccessAnim && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col items-center gap-6 animate-pop-in max-w-xs w-full">
            <div className="relative w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <div className="animate-plane-takeoff text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </div>
              <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">נשלח בהצלחה!</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">ההודעה בדרך לאמא...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
