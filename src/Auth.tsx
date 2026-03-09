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
      toast.error(error.message || "פעולה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8 mt-12 px-4">
      <div className="text-center flex flex-col items-center gap-4">
        <img src="/src/assets/icons/AppIcon.svg" alt="App Icon" className="w-24 h-24 shadow-sm rounded-2xl" />
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">מעקב טיפולים</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400">ניהול קליניקה פרטי ומאובטח</p>
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
            <input
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
              type="password"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="••••••••"
              required
            />
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
