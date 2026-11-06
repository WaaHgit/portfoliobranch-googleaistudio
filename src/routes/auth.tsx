import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — GATEI Admin" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/admin" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/admin" });
  }

  return (
    <section className="container-narrow py-24 max-w-md">
      <p className="uppercase-tracked text-primary">Admin</p>
      <h1 className="font-display text-4xl mt-3">Sign in</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Restricted access. Only authorized administrator accounts can manage content.
      </p>
      <form onSubmit={signIn} className="mt-10 space-y-5">
        <label className="block">
          <span className="uppercase-tracked text-muted-foreground">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </label>
        <label className="block">
          <span className="uppercase-tracked text-muted-foreground">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full uppercase-tracked bg-primary text-primary-foreground py-3 disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-xs text-muted-foreground mt-8">
        Public sign-ups are disabled. Administrator credentials are managed directly in Supabase.
      </p>
    </section>
  );
}
