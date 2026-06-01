import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useCampaigns, useCreateCampaign, useDeleteCampaign } from "./useCampaigns.js";
import { useLogout } from "../auth/useAuth.js";
import { ThemeControl } from "../theme/ThemePanel.js";
import { useConfirm } from "../components/ConfirmDialog.js";
import { useToast } from "../components/Toast.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";

export function CampaignsPage() {
  const list = useCampaigns();
  const create = useCreateCampaign();
  const remove = useDeleteCampaign();
  const logout = useLogout();
  const confirm = useConfirm();
  const toast = useToast();
  const [name, setName] = useState("");

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName("");
          toast("Campaign created.", "success");
        },
      },
    );
  };

  const onDelete = async (id: string, cname: string) => {
    const ok = await confirm({
      title: `Delete “${cname}”?`,
      message: "This permanently removes the campaign and everything in it. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) remove.mutate(id, { onSuccess: () => toast("Campaign deleted.") });
  };

  return (
    <div className="min-h-screen text-ink-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-800/80 bg-ink-950/70 px-6 py-3 backdrop-blur">
        <h1 className="display text-lg font-semibold tracking-tight">Pico's TTRPG Toolkit</h1>
        <div className="flex items-center gap-2">
          <ThemeControl />
          <button className="btn-ghost" onClick={() => logout.mutate()}>Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="display text-2xl font-semibold">Campaigns</h2>
        </div>

        <form onSubmit={onCreate} className="card mb-8 flex gap-2 p-3">
          <input
            className="input flex-1"
            placeholder="Name a new campaign…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn-primary px-5" disabled={create.isPending || !name.trim()}>
            Create
          </button>
        </form>

        {list.isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {list.isError && <p className="text-red-400">Failed to load campaigns.</p>}

        {list.data && list.data.length === 0 && (
          <EmptyState
            icon="⚔"
            title="No campaigns yet"
            description="Create your first campaign above to start building your table."
          />
        )}

        {list.data && list.data.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.data.map((c) => (
              <li
                key={c.id}
                className="card group flex flex-col justify-between p-4 transition-colors hover:border-accent-500/50"
              >
                <div>
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="display text-lg font-semibold text-ink-50 transition-colors group-hover:text-accent-500"
                  >
                    {c.name}
                  </Link>
                  {c.description && <p className="mt-1 text-sm text-ink-400">{c.description}</p>}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Link to={`/campaigns/${c.id}`} className="btn-primary">Open ↗</Link>
                  <button
                    className="btn-ghost text-ink-400 hover:text-red-400"
                    onClick={() => onDelete(c.id, c.name)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
