import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPatient?: {
    _id: Id<"patients">;
    name: string;
    notes?: string;
  } | null;
}

export function AddPatientModal({ isOpen, onClose, editingPatient }: AddPatientModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    notes: "",
  });
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const patients = useQuery(api.patients.list) || [];
  const createPatient = useMutation(api.patients.create);
  const updatePatient = useMutation(api.patients.update);

  useEffect(() => {
    if (isOpen) {
      if (editingPatient) {
        setFormData({
          name: editingPatient.name,
          notes: editingPatient.notes || "",
        });
      } else {
        setFormData({ name: "", notes: "" });
      }
      
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingPatient]);

  const normalizedName = formData.name.trim().toLowerCase();
  const isDuplicate = !editingPatient && normalizedName !== "" && patients.some(
    (p) => p.name.trim().toLowerCase() === normalizedName
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("שם המטופלת הוא שדה חובה");
      return;
    }

    if (isDuplicate) {
      toast.error("מטופלת בשם זה כבר קיימת במערכת");
      return;
    }

    try {
      if (editingPatient) {
        await updatePatient({
          patientId: editingPatient._id,
          name: formData.name.trim(),
          notes: formData.notes || undefined,
          sessionRate: 0, // Keeping current simplified logic
        });
        toast.success("פרטי המטופלת עודכנו");
      } else {
        await createPatient({
          name: formData.name.trim(),
          sessionRate: 0,
          notes: formData.notes || undefined,
        });
        toast.success("מטופלת נוספה בהצלחה");
      }
      onClose();
    } catch (error) {
      toast.error(editingPatient ? "עדכון הפרטים נכשל" : "הוספת המטופלת נכשלה");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-container shadow-2xl border border-gray-100 dark:border-gray-800 transform transition-all animate-in fade-in zoom-in duration-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">
            {editingPatient ? "עריכת פרטי מטופלת" : "הוספת מטופלת חדשה"}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                שם מלא *
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all text-lg ${
                  isDuplicate 
                    ? "border-amber-500 ring-amber-500/20 focus:ring-amber-500" 
                    : "border-gray-300 dark:border-gray-700 focus:ring-primary focus:border-transparent"
                }`}
                placeholder="הכניסי שם מלא"
                required
              />
              {isDuplicate && (
                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  מטופלת בשם זה כבר קיימת במערכת
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                הערות
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="פרטים נוספים, רקע וכו'"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isDuplicate || !formData.name.trim()}
              className={`w-full py-3 font-bold rounded-lg transition-all active:scale-95 shadow-lg ${
                isDuplicate || !formData.name.trim()
                  ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" 
                  : "bg-primary text-white hover:bg-primary-hover"
              }`}
            >
              {editingPatient ? "עדכון פרטים" : "שמירה"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
