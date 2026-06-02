import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "./useAuth.js";
import { ThemeControl } from "../theme/ThemePanel.js";

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const register = useRegister();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate(
      {
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
      },
      { onSuccess: () => navigate("/campaigns", { replace: true }) },
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeControl />
      </div>

      <form onSubmit={onSubmit} className="card w-full max-w-sm p-8 animate-[fadeIn_0.25s_ease-out]">
        <div className="mb-8 text-center">
          <h1 className="display text-2xl font-semibold tracking-tight text-ink-50">Create account</h1>
          <p className="mt-1 text-sm text-ink-400">Join or run a campaign</p>
        </div>

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Username
        </label>
        <input
          className="input mb-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          placeholder="3+ chars, letters/numbers/_.-"
          required
        />

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Display name <span className="text-ink-600">(optional)</span>
        </label>
        <input
          className="input mb-3"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Shown to your table"
        />

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
          Password
        </label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          required
        />

        {register.isError && (
          <p className="mt-3 text-sm text-red-400">
            {register.error instanceof Error ? register.error.message : "Could not register."}
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending || username.trim().length < 3 || password.length < 6}
          className="btn-primary mt-6 w-full"
        >
          {register.isPending ? "Creating…" : "Create account"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-400">
          Already have an account?{" "}
          <Link to="/login" className="text-accent-500 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
