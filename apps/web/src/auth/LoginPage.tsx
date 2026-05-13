import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "./useAuth.js";

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
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-semibold text-ink-50">Pico's TTRPG Toolkit</h1>
        <p className="mb-6 text-sm text-ink-300">Game Master sign-in</p>

        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-300">
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
          className="btn-primary mt-5 w-full"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
