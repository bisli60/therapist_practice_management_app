import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

interface AuthProps {
  onLogin: (userId: Id<"users">) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const login = useMutation(api.users.login);
  const register = useMutation(api.users.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let userId;
      if (flow === "signIn") {
        userId = await login({ email, secretCode });
        toast.success("התחברת בהצלחה");
      } else {
        userId = await register({ email, secretCode });
        toast.success("נרשמת בהצלחה");
      }
      onLogin(userId);
    } catch (error: any) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("User already exists")) {
        toast.error("משתמש עם אימייל זה כבר קיים במערכת. נסי להתחבר.");
      } else if (errorMessage.includes("Invalid email or secret code")) {
        toast.error("אימייל או קוד סודי לא נכונים. נסי שוב.");
      } else {
        toast.error(errorMessage || "פעולה נכשלה");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8 mt-12 px-4">
      <div className="text-center flex flex-col items-center gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">מערכת לניהול קליניקה</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400">ניהול מטופלים, תיעוד טיפולים ומעקב הכנסות בחשבון אישי ומאובטח.</p>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-8 rounded-container shadow-xl border border-gray-100 dark:border-gray-800">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">אימייל</label>
            <input
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">קוד סודי</label>
            <div className="relative">
              <input
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                type={showSecretCode ? "text" : "password"}
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecretCode(!showSecretCode)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showSecretCode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <button 
            className="w-full py-3 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50" 
            type="submit" 
            disabled={submitting}
          >
            {submitting ? "מעבד..." : flow === "signIn" ? "התחברות" : "הרשמה"}
          </button>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            <span>
              {flow === "signIn" ? "אין לך חשבון? " : "כבר יש לך חשבון? "}
            </span>
            <button
              type="button"
              className="text-primary font-bold hover:underline"
              onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            >
              {flow === "signIn" ? "הירשם עכשיו" : "התחבר עכשיו"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
