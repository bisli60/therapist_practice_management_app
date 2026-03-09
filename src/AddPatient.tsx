import { useState } from "react";
import { AddPatientModal } from "./AddPatientModal";
import { Id } from "../convex/_generated/dataModel";

export function AddPatient({ userId }: { userId: Id<"users"> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-container shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-all duration-300">
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        הוספת מטופלת חדשה
      </button>

      <AddPatientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        userId={userId}
      />
    </div>
  );
}
