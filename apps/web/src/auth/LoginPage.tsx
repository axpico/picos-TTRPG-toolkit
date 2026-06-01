import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "./useAuth.js";
import { ThemeControl } from "../theme/ThemePanel.js";

export function LoginPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const login = useLogin();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(password, {
      onSuccess: () => navigate("/campaigns", { replace: true }),
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeControl />
      </div>

      <form
        onSubmit={onSubmit}
        className="card w-full max-w-sm p-8 animate-[fadeIn_0.25s_ease-out]"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent-500/40 bg-accent-500/10 text-accent-500">
            <span className="display text-2xl">P</span>
          </div>
          <h1 className="display text-2xl font-semibold tracking-tight text-ink-50">
            Pico's TTRPG Toolkit
          </h1>
          <p className="mt-1 text-sm text-ink-400">Game Master sign-in</p>
        </div>

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Password
        </label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          required
        />

        {login.isError && (
          <p className="mt-3 text-sm text-red-400">
            {login.error instanceof Error ? login.error.message : "Sign-in failed."}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending || password.length === 0}
          className="btn-primary mt-6 w-full"
        >
          {login.isPending ? "Signing in…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
