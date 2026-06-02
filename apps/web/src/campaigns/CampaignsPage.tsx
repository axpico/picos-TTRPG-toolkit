import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Campaign } from "@toolkit/shared";
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useJoinCampaign,
} from "./useCampaigns.js";
import { useLogout, useMe } from "../auth/useAuth.js";
import { ThemeControl } from "../theme/ThemePanel.js";
import { BuyMeCoffee } from "../components/BuyMeCoffee.js";
import { useConfirm } from "../components/ConfirmDialog.js";
import { useToast } from "../components/Toast.js";
import { EmptyState } from "../components/EmptyState.js";
import { Skeleton } from "../components/Skeleton.js";

export function CampaignsPage() {
  const me = useMe();
  const list = useCampaigns();
  const create = useCreateCampaign();
  const join = useJoinCampaign();
  const remove = useDeleteCampaign();
  const logout = useLogout();
  const confirm = useConfirm();
  const toast = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, {
      onSuccess: () => {
        setName("");
        toast("Campaign created.", "success");
      },
    });
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    join.mutate(code.trim(), {
      onSuccess: (c) => {
        setCode("");
        toast(`Joined “${c.name}”.`, "success");
      },
      onError: (err) => toast(err instanceof Error ? err.message : "Could not join.", "error"),
    });
  };

  const onDelete = async (c: Campaign) => {
    const ok = await confirm({
      title: `Delete “${c.name}”?`,
      message: "This permanently removes the campaign and everything in it. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) remove.mutate(c.id, { onSuccess: () => toast("Campaign deleted.") });
  };

  const campaigns = list.data ?? [];
  const running = campaigns.filter((c) => c.myRole === "dm");
  const playing = campaigns.filter((c) => c.myRole === "player");
  const displayName = me.data?.user?.displayName || me.data?.user?.username;

  return (
    <div className="min-h-screen text-ink-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-800/80 bg-ink-950/70 px-6 py-3 backdrop-blur">
        <h1 className="display text-lg font-semibold tracking-tight">Pico's TTRPG Toolkit</h1>
        <div className="flex items-center gap-3">
          {displayName && <span className="text-sm text-ink-400">{displayName}</span>}
          <BuyMeCoffee />
          <ThemeControl />
          <button className="btn-ghost" onClick={() => logout.mutate()}>Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <form onSubmit={onCreate} className="card flex gap-2 p-3">
            <input
              className="input flex-1"
              placeholder="Name a new campaign…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn-primary px-4" disabled={create.isPending || !name.trim()}>
              Create
            </button>
          </form>
          <form onSubmit={onJoin} className="card flex gap-2 p-3">
            <input
              className="input flex-1 font-mono"
              placeholder="Paste a join code…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn-ghost px-4" disabled={join.isPending || !code.trim()}>
              Join
            </button>
          </form>
        </div>

        {list.isLoading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        )}
        {list.isError && <p className="text-red-400">Failed to load campaigns.</p>}

        {list.data && campaigns.length === 0 && (
          <EmptyState
            icon="⚔"
            title="No campaigns yet"
            description="Create one to run as DM, or paste a join code from your DM to play."
          />
        )}

        {running.length > 0 && (
          <Section title="Running" subtitle="Campaigns you DM">
            {running.map((c) => (
              <CampaignCard key={c.id} c={c} onDelete={() => onDelete(c)} />
            ))}
          </Section>
        )}
        {playing.length > 0 && (
          <Section title="Playing" subtitle="Campaigns you've joined">
            {playing.map((c) => (
              <CampaignCard key={c.id} c={c} />
            ))}
          </Section>
        )}
      </main>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="display text-xl font-semibold">{title}</h2>
        <span className="text-sm text-ink-500">{subtitle}</span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</ul>
    </section>
  );
}

function CampaignCard({ c, onDelete }: { c: Campaign; onDelete?: () => void }) {
  return (
    <li className="card group flex flex-col justify-between p-4 transition-colors hover:border-accent-500/50">
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
        <Link to={`/campaigns/${c.id}`} className="btn-primary">
          {c.myRole === "dm" ? "Open ↗" : "Play ↗"}
        </Link>
        {onDelete && (
          <button className="btn-ghost text-ink-400 hover:text-red-400" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </li>
  );
}
