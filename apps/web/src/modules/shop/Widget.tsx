import { useMemo, useState } from "react";
import clsx from "clsx";
import type { GenerateShopInput, Shop, ShopItem } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Markdown } from "../../components/Markdown.js";
import { useConfirm } from "../../components/ConfirmDialog.js";
import { useToast } from "../../components/Toast.js";
import { InlineConfirm } from "../shared.js";
import { ITEM_TYPES, RARITIES, fmtPrice, rarityColor } from "./constants.js";
import {
  useCreateShop,
  useCreateShopItem,
  useDeleteShop,
  useDeleteShopItem,
  useGenerateShop,
  useShops,
  useUpdateShop,
  useUpdateShopItem,
} from "./api.js";

function ShopWidget({ campaignId, state, setState }: WidgetContext) {
  const list = useShops(campaignId);
  const create = useCreateShop(campaignId);
  const remove = useDeleteShop(campaignId);

  const selectedId = (state?.selectedShopId as string | undefined) ?? null;
  const selected =
    list.data?.find((s) => s.id === selectedId) ?? list.data?.[0] ?? null;

  const select = (id: string | null) => setState({ selectedShopId: id });

  return (
    <div className="flex h-full flex-col">
      <datalist id="shop-item-types">
        {ITEM_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="shop-item-rarities">
        {RARITIES.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <div className="flex items-center gap-1 border-b border-ink-700 p-2">
        <select
          className="input flex-1"
          value={selected?.id ?? ""}
          onChange={(e) => select(e.target.value || null)}
        >
          <option value="" disabled>
            {list.data?.length ? "Select shop…" : "No shops yet"}
          </option>
          {list.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.items.length} items
            </option>
          ))}
        </select>
        <button
          className="btn-primary px-2"
          onClick={() =>
            create.mutate({ name: "New shop" }, { onSuccess: (s) => select(s.id) })
          }
          title="New empty shop"
        >
          +
        </button>
      </div>

      {selected ? (
        <ShopEditor
          key={selected.id}
          shop={selected}
          campaignId={campaignId}
          onDelete={() => remove.mutate(selected.id, { onSuccess: () => select(null) })}
        />
      ) : (
        <Generator campaignId={campaignId} onCreated={(id) => select(id)} />
      )}
    </div>
  );
}

interface EditorProps {
  shop: Shop;
  campaignId: string;
  onDelete: () => void;
}

function ShopEditor({ shop, campaignId, onDelete }: EditorProps) {
  const updateShop = useUpdateShop(campaignId);
  const addItem = useCreateShopItem(campaignId);
  const updateItem = useUpdateShopItem(campaignId);
  const removeItem = useDeleteShopItem(campaignId);
  const confirm = useConfirm();
  const toast = useToast();
  const [newItem, setNewItem] = useState("");
  const [filter, setFilter] = useState("");
  const [notesPreview, setNotesPreview] = useState(Boolean(shop.notes));

  const items = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return shop.items;
    return shop.items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.type ?? "").toLowerCase().includes(q) ||
        it.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [shop.items, filter]);

  const totalValue = useMemo(
    () => shop.items.reduce((sum, it) => sum + (it.price ?? 0) * (it.stock ?? 1), 0),
    [shop.items],
  );

  const adjustStock = (it: ShopItem, delta: number) => {
    const next = Math.max(0, (it.stock ?? 0) + delta);
    updateItem.mutate({ shopId: shop.id, id: it.id, input: { stock: next } });
    if (next === 0 && delta < 0) toast(`${it.name} is out of stock`, "info");
  };

  const handleRemoveItem = async (it: ShopItem) => {
    const ok = await confirm({
      title: "Remove item",
      message: `Remove "${it.name}" from this shop?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) removeItem.mutate({ shopId: shop.id, id: it.id });
  };

  const submitNewItem = () => {
    if (!newItem.trim()) return;
    addItem.mutate(
      { shopId: shop.id, input: { name: newItem.trim() } },
      { onSuccess: () => setNewItem("") },
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-1 border-b border-ink-700 p-2">
        <input
          className="input flex-1 font-medium"
          defaultValue={shop.name}
          onBlur={(e) =>
            e.target.value !== shop.name &&
            updateShop.mutate({ id: shop.id, input: { name: e.target.value } })
          }
        />
        <InlineConfirm onConfirm={onDelete} title="Delete shop" />
      </header>

      <div className="flex items-center justify-between gap-2 border-b border-ink-800 px-2 py-1 text-xs text-ink-400">
        <span>{shop.items.length} items</span>
        <span>
          stock value ≈ <span className="font-medium text-ink-200">{fmtPrice(totalValue)}</span>
        </span>
      </div>

      <div className="px-2 pt-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-ink-500">Notes</span>
          {shop.notes && (
            <button
              className="ml-auto text-[10px] text-ink-500 hover:text-ink-200"
              onClick={() => setNotesPreview((v) => !v)}
            >
              {notesPreview ? "edit" : "preview"}
            </button>
          )}
        </div>
        {notesPreview && shop.notes ? (
          <div
            className="rounded-md border border-ink-700 bg-ink-900/40 p-2"
            onDoubleClick={() => setNotesPreview(false)}
          >
            <Markdown>{shop.notes}</Markdown>
          </div>
        ) : (
          <textarea
            className="input min-h-[40px] w-full text-xs"
            placeholder="Shop notes (markdown) — keeper, location, rumors…"
            defaultValue={shop.notes ?? ""}
            onBlur={(e) => {
              updateShop.mutate({ id: shop.id, input: { notes: e.target.value || undefined } });
              if (e.target.value) setNotesPreview(true);
            }}
          />
        )}
      </div>

      {shop.items.length > 3 && (
        <input
          className="input mx-2 mt-2 text-xs"
          placeholder="Filter items…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      <ul className="flex-1 space-y-1 overflow-auto p-2 text-sm">
        {items.map((it) => (
          <Row
            key={it.id}
            item={it}
            onChange={(input) => updateItem.mutate({ shopId: shop.id, id: it.id, input })}
            onAdjustStock={(delta) => adjustStock(it, delta)}
            onRemove={() => handleRemoveItem(it)}
          />
        ))}
        {shop.items.length === 0 && (
          <li className="px-2 py-6">
            <EmptyState
              icon="📦"
              title="Empty stock"
              description="Add an item below, or delete this shop and generate a stocked one."
            />
          </li>
        )}
        {shop.items.length > 0 && items.length === 0 && (
          <li className="py-4 text-center text-xs text-ink-500">No items match the filter.</li>
        )}
      </ul>

      <div className="flex items-center gap-1 border-t border-ink-700 p-2">
        <input
          className="input flex-1"
          placeholder="Add item by name"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNewItem()}
        />
        <button
          className="btn-primary px-2"
          disabled={!newItem.trim() || addItem.isPending}
          onClick={submitNewItem}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface RowProps {
  item: ShopItem;
  onChange: (input: Parameters<ReturnType<typeof useUpdateShopItem>["mutate"]>[0]["input"]) => void;
  onAdjustStock: (delta: number) => void;
  onRemove: () => void;
}

function Row({ item, onChange, onAdjustStock, onRemove }: RowProps) {
  return (
    <li
      className={clsx(
        "flex flex-wrap items-center gap-1 rounded-md border border-l-2 border-ink-700 bg-ink-900 px-2 py-1.5",
        rarityColor(item.rarity).split(" ")[0],
      )}
    >
      <input
        className="input min-w-[8rem] flex-1"
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <input
        list="shop-item-types"
        className="input w-24"
        placeholder="Type"
        value={item.type ?? ""}
        onChange={(e) => onChange({ type: e.target.value || undefined })}
      />
      <input
        list="shop-item-rarities"
        className={clsx("input w-28", rarityColor(item.rarity).split(" ")[1])}
        placeholder="Rarity"
        value={item.rarity ?? ""}
        onChange={(e) => onChange({ rarity: e.target.value || undefined })}
      />
      <input
        type="number"
        className="input w-20 text-right"
        placeholder="Price"
        value={item.price ?? ""}
        onChange={(e) =>
          onChange({ price: e.target.value === "" ? undefined : Number(e.target.value) })
        }
      />
      <div className="flex items-center">
        <button
          className="btn-ghost h-7 px-1.5"
          onClick={() => onAdjustStock(-1)}
          disabled={(item.stock ?? 0) <= 0}
          title="Sell one"
        >
          −
        </button>
        <input
          type="number"
          className="input w-12 px-1 text-center"
          placeholder="#"
          value={item.stock ?? ""}
          onChange={(e) =>
            onChange({ stock: e.target.value === "" ? undefined : Number(e.target.value) })
          }
        />
        <button
          className="btn-ghost h-7 px-1.5"
          onClick={() => onAdjustStock(1)}
          title="Restock one"
        >
          +
        </button>
      </div>
      <button className="btn-ghost px-2 text-ink-500 hover:text-red-400" onClick={onRemove} title="Remove item">
        ×
      </button>
    </li>
  );
}

interface GeneratorProps {
  campaignId: string;
  onCreated: (id: string) => void;
}

function Generator({ campaignId, onCreated }: GeneratorProps) {
  const generate = useGenerateShop(campaignId);
  const toast = useToast();
  const [name, setName] = useState("");
  const [params, setParams] = useState<Omit<GenerateShopInput, "name">>({
    flavor: "general",
    size: "medium",
    rarityCap: "rare",
  });

  return (
    <div className="flex flex-1 flex-col items-stretch gap-2 p-4 text-sm">
      <p className="text-ink-400">No shop selected. Create one above, or generate:</p>
      <input
        className="input"
        placeholder="Shop name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <select
          className="input"
          value={params.flavor}
          onChange={(e) =>
            setParams({ ...params, flavor: e.target.value as GenerateShopInput["flavor"] })
          }
        >
          <option value="general">General store</option>
          <option value="weapons">Weapons</option>
          <option value="alchemy">Alchemy</option>
          <option value="magical">Magical</option>
          <option value="spacer">Spacer / tech</option>
        </select>
        <select
          className="input"
          value={params.size}
          onChange={(e) =>
            setParams({ ...params, size: e.target.value as GenerateShopInput["size"] })
          }
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <select
          className="input col-span-2"
          value={params.rarityCap}
          onChange={(e) =>
            setParams({ ...params, rarityCap: e.target.value as GenerateShopInput["rarityCap"] })
          }
        >
          <option value="common">Cap: common</option>
          <option value="uncommon">Cap: uncommon</option>
          <option value="rare">Cap: rare</option>
          <option value="very rare">Cap: very rare</option>
          <option value="legendary">Cap: legendary</option>
        </select>
      </div>
      <button
        className="btn-primary"
        onClick={() =>
          generate.mutate(
            { ...params, name: name.trim() || undefined },
            {
              onSuccess: (s) => {
                toast(`Generated ${s.items.length} items`, "success");
                onCreated(s.id);
              },
            },
          )
        }
        disabled={generate.isPending}
      >
        {generate.isPending ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}

registerWidget({
  type: "shop",
  title: "Shops",
  defaultSize: { w: 560, h: 440 },
  Component: ShopWidget,
});

export {};
