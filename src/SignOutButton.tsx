"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm active:scale-95"
      onClick={() => void signOut()}
    >
      התנתקות
    </button>
  );
}
