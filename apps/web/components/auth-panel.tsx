"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../lib/supabase/browser";

type Props = {
  userEmail?: string | null;
};

export function AuthPanel({ userEmail }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signIn() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setStatus("Enter your email first.");
      return;
    }

    setIsSending(true);
    setStatus("Sending magic link...");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      setStatus(error ? error.message : "Check your email for a magic link.");
    } catch (error) {
      console.error("Magic link sign-in failed", error);
      setStatus("Magic link request failed. Check Supabase Auth settings and try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function signOut() {
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  if (userEmail) {
    return (
      <div className="panel-shell rounded-[2.2rem] border-emerald-300/14 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/55">
          Logged in
        </p>
        <h2 className="mt-2 font-display text-3xl leading-tight text-white">
          Command center unlocked.
        </h2>
        <p className="mt-2 text-sm text-slate-300/72">
          Signed in as {userEmail}. You can now add assets to your watchlist and
          stream live market updates.
        </p>
        <div className="mt-5 rounded-[1.5rem] border border-emerald-300/12 bg-emerald-300/[0.08] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/55">
            Status
          </p>
          <p className="mt-2 text-sm font-medium text-white">
            Watchlist actions are enabled for this account.
          </p>
        </div>
        <button
          className="mt-5 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSigningOut}
          onClick={signOut}
          type="button"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    );
  }

  return (
    <div className="panel-shell rounded-[2.2rem] p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-100/48">
        Sign in
      </p>
      <h2 className="mt-2 font-display text-3xl leading-tight">
        Save assets and get live market signals.
      </h2>
      <p className="mt-2 text-sm text-slate-300/72">
        Use a magic link so your dashboard can remember your watchlist and show
        your own real-time crypto command center.
      </p>
      <div className="mt-4 rounded-[1.5rem] border border-amber-300/12 bg-amber-300/[0.07] p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-amber-100/55">
          Sign-in required
        </p>
        <p className="mt-2 text-sm text-slate-200">
          You must log in before adding anything to your watchlist.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-full border border-cyan-300/12 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-cyan-200/60"
          disabled={isSending}
          onClick={signIn}
          type="button"
        >
          {isSending ? "Sending..." : "Send link"}
        </button>
      </div>
      {status ? <p className="mt-3 text-sm text-slate-300/72">{status}</p> : null}
    </div>
  );
}
