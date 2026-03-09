"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full transition-colors duration-300">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "סיסמה שגויה. אנא נסה שוב.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "לא ניתן להתחבר, האם התכוונת להירשם?"
                  : "לא ניתן להירשם, האם התכוונת להתחבר?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="אימייל"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="סיסמה"
          required
        />
        <button className="auth-button active:scale-95 transition-all" type="submit" disabled={submitting}>
          {flow === "signIn" ? "התחברות" : "הרשמה"}
        </button>
        <div className="text-center text-sm text-secondary dark:text-gray-400">
          <span>
            {flow === "signIn"
              ? "אין לך חשבון? "
              : "כבר יש לך חשבון? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-bold cursor-pointer transition-all"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "הירשם במקום" : "התחבר במקום"}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200 dark:border-gray-800" />
        <span className="mx-4 text-secondary dark:text-gray-500">או</span>
        <hr className="my-4 grow border-gray-200 dark:border-gray-800" />
      </div>
      <button className="auth-button bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 active:scale-95 transition-all border border-gray-200 dark:border-gray-800" onClick={() => void signIn("anonymous")}>
        התחבר באופן אנונימי
      </button>
    </div>
  );
}
