import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSession?: any;
  userId: Id<"users">;
}

export function AddSessionModal({ isOpen, onClose, editingSession, userId }: AddSessionModalProps) {
  const [formData, setFormData] = useState({
    patientId: "",
    date: new Date().toISOString().split("T")[0],
    treatmentType: "",
    price: "",
    amountPaid: "",
    paymentMethod: "",
    notes: "",
  });

  const [isPatientPickerOpen, setIsPatientPickerOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const patientSearchRef = useRef<HTMLInputElement>(null);

  const patients = useQuery(api.patients.list, userId ? { userId } : "skip") || [];
  const settings = useQuery(api.settings.get, userId ? { userId } : "skip");
  
  const createSession = useMutation(api.sessions.create);
  const updateSession = useMutation(api.sessions.update);
  const removeSession = useMutation(api.sessions.remove);
  const createPayment = useMutation(api.payments.create);

  useEffect(() => {
    if (editingSession) {
      const typeMatch = editingSession.notes?.match(/סוג טיפול: (.*?)(?: \||$)/);
      const pureNotes = editingSession.notes?.split(" | ")[1] || "";
      
      setFormData({
        patientId: editingSession.patientId,
        date: editingSession.date,
        treatmentType: typeMatch ? typeMatch[1] : "",
        price: editingSession.cost.toString(),
        amountPaid: editingSession.paymentAmount?.toString() || "0", 
        paymentMethod: editingSession.paymentMethod || "cash",
        notes: pureNotes,
      });
    } else {
      setFormData({
        patientId: "",
        date: new Date().toISOString().split("T")[0],
        treatmentType: "",
        price: "",
        amountPaid: "",
        paymentMethod: "cash",
        notes: "",
      });
    }
    setIsPatientPickerOpen(false);
    setPatientSearch("");
  }, [editingSession, isOpen]);

  useEffect(() => {
    if (isPatientPickerOpen) {
      setTimeout(() => patientSearchRef.current?.focus(), 100);
    }
  }, [isPatientPickerOpen]);

  const selectedPatient = patients.find(p => p._id === formData.patientId);

  const filteredPatients = patients
    .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase().trim()))
    .sort((a, b) => a.name.localeCompare(b.name, "he"));

  const handlePatientSelect = (patient: any) => {
    setFormData({
      ...formData,
      patientId: patient._id,
      price: (patient.sessionRate || 0).toString(),
      amountPaid: (patient.sessionRate || 0).toString(),
    });
    setIsPatientPickerOpen(false);
    setPatientSearch("");
  };

  const handleDelete = async () => {
    if (confirm("האם את בטובה שברצונך למחוק את הטיפול?")) {
      try {
        await removeSession({ sessionId: editingSession._id, userId });
        toast.success("הטיפול נמחק בהצלחה");
        onClose();
      } catch (error: any) {
        toast.error(`מחיקת הטיפול נכשלה: ${error.message}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.price) {
      toast.error("מטופלת ועלות הם שדות חובה");
      return;
    }

    try {
      const treatmentNote = `סוג טיפול: ${formData.treatmentType}${formData.notes ? ` | ${formData.notes}` : ""}`;
      const sessionCost = parseFloat(formData.price) || 0;
      const paidAmount = parseFloat(formData.amountPaid) || 0;
      const isPaid = paidAmount >= sessionCost;
      
      if (editingSession) {
        await updateSession({
          sessionId: editingSession._id,
          userId,
          patientId: formData.patientId as Id<"patients">,
          date: formData.date,
          cost: sessionCost,
          notes: treatmentNote,
          isPaid,
          paymentAmount: paidAmount,
          paymentMethod: formData.paymentMethod,
        });
        toast.success("הטיפול עודכן בהצלחה");
      } else {
        let paymentId: Id<"payments"> | undefined;

        if (paidAmount > 0) {
          paymentId = await createPayment({
            userId,
            patientId: formData.patientId as Id<"patients">,
            amount: paidAmount,
            date: formData.date,
            method: formData.paymentMethod || "cash",
            notes: `תשלום עבור טיפול ${formData.treatmentType}`,
          });
        }

        await createSession({
          userId,
          patientId: formData.patientId as Id<"patients">,
          date: formData.date,
          duration: 50,
          cost: sessionCost,
          notes: treatmentNote,
          isPaid,
          paymentId,
        });
        toast.success("הטיפול תועד בהצלחה");
      }
      onClose();
    } catch (error: any) {
      toast.error(`הפעולה נכשלה: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-container shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300 border border-gray-100 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingSession ? "עריכת טיפול" : "תיעוד טיפול חדש"}
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Enhanced Patient Picker */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">מטופלת *</label>
            <button
              type="button"
              onClick={() => setIsPatientPickerOpen(!isPatientPickerOpen)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white flex justify-between items-center focus:ring-2 focus:ring-primary transition-all text-right"
            >
              {selectedPatient ? (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedPatient.debt > 0 ? 'bg-red-500' : selectedPatient.debt < 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span>{selectedPatient.name}</span>
                </div>
              ) : (
                <span className="text-gray-400">בחרי מטופלת...</span>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-9"/></svg>
            </button>

            {isPatientPickerOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <input
                    ref={patientSearchRef}
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="חיפוש לפי שם..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-700 rounded-md text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredPatients.map(p => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => handlePatientSelect(p)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.debt > 0 ? 'bg-red-500' : p.debt < 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-bold text-gray-900 dark:text-white">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-medium text-gray-400">
                        {p.debt > 0 ? `חוב: ₪${p.debt.toFixed(0)}` : p.debt < 0 ? `זיכוי: ₪${Math.abs(p.debt).toFixed(0)}` : 'מאוזן'}
                      </span>
                    </button>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-500">לא נמצאו תוצאות</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">תאריך</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">סוג טיפול</label>
              <select
                value={formData.treatmentType}
                onChange={(e) => setFormData({ ...formData, treatmentType: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">בחר סוג</option>
                {settings?.treatmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">מחיר טיפול</label>
              <div className="relative">
                <span className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500">₪</span>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full pr-8 pl-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">סכום ששולם</label>
              <div className="relative">
                <span className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500">₪</span>
                <input
                  type="number"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                  className="w-full pr-8 pl-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">אמצעי תשלום</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              {settings?.paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">הערות</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="הערות נוספות על הטיפול..."
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-hover active:scale-95 transition-all"
              >
                {editingSession ? "שמירת שינויים" : "שמירת טיפול"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                ביטול
              </button>
            </div>
            
            {editingSession && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full py-2 text-sm text-red-600 dark:text-red-400 font-bold hover:underline transition-all mt-2"
              >
                מחיקת הטיפול מהמערכת
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
