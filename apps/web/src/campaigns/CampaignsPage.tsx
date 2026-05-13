import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useCampaigns, useCreateCampaign, useDeleteCampaign } from "./useCampaigns.js";
import { useLogout } from "../auth/useAuth.js";

export function CampaignsPage() {
  const list = useCampaigns();
  const create = useCreateCampaign();
  const remove = useDeleteCampaign();
  const logout = useLogout();
  const [name, setName] = useState("");

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, { onSuccess: () => setName("") });
  };

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50">
      <header className="border-b border-ink-800 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">Pico's TTRPG Toolkit</h1>
        <button className="btn-ghost" onClick={() => logout.mutate()}>
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="mb-4 text-lg font-medium">Campaigns</h2>

        <form onSubmit={onCreate} className="card mb-6 flex gap-2 p-3">
          <input
            className="input flex-1"
            placeholder="New campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn-primary" disabled={create.isPending || !name.trim()}>
            Create
          </button>
        </form>

        {list.isLoading && <p className="text-ink-400">Loading…</p>}
        {list.isError && (
          <p className="text-red-400">Failed to load campaigns.</p>
        )}

        <ul className="space-y-2">
          {list.data?.map((c) => (
            <li key={c.id} className="card flex items-center justify-between px-4 py-3">
              <div>
                <Link
                  to={`/campaigns/${c.id}`}
                  className="font-medium text-ink-50 hover:text-accent-500"
                >
                  {c.name}
                </Link>
                {c.description && (
                  <p className="text-sm text-ink-400">{c.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/campaigns/${c.id}`} className="btn-ghost">
                  Open
                </Link>
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (confirm(`Delete campaign "${c.name}"? This cannot be undone.`)) {
                      remove.mutate(c.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {list.data?.length === 0 && (
            <li className="text-ink-400">No campaigns yet — create one above.</li>
          )}
        </ul>
      </main>
    </div>
  );
}
