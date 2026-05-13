import { useState } from "react";
import type { GenerateShopInput, Shop, ShopItem } from "@toolkit/shared";
import { registerWidget, type WidgetContext } from "../../canvas/WidgetRegistry.js";
import { InlineConfirm } from "../shared.js";
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
            create.mutate(
              { name: "New shop" },
              { onSuccess: (s) => select(s.id) },
            )
          }
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
        <Generator
          campaignId={campaignId}
          onCreated={(id) => select(id)}
        />
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
  const [newItem, setNewItem] = useState("");

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
      <textarea
        className="input mx-2 mt-2 min-h-[40px] text-xs"
        placeholder="Shop notes"
        defaultValue={shop.notes ?? ""}
        onBlur={(e) =>
          updateShop.mutate({ id: shop.id, input: { notes: e.target.value || undefined } })
        }
      />
      <ul className="flex-1 space-y-1 overflow-auto p-2 text-sm">
        {shop.items.map((it) => (
          <Row
            key={it.id}
            item={it}
            onChange={(input) =>
              updateItem.mutate({ shopId: shop.id, id: it.id, input })
            }
            onRemove={() => removeItem.mutate({ shopId: shop.id, id: it.id })}
          />
        ))}
        {shop.items.length === 0 && (
          <li className="text-ink-400">Empty stock — add or generate items.</li>
        )}
      </ul>
      <div className="flex items-center gap-1 border-t border-ink-700 p-2">
        <input
          className="input flex-1"
          placeholder="Add item by name"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) {
              addItem.mutate(
                { shopId: shop.id, input: { name: newItem.trim() } },
                { onSuccess: () => setNewItem("") },
              );
            }
          }}
        />
        <button
          className="btn-primary px-2"
          disabled={!newItem.trim() || addItem.isPending}
          onClick={() =>
            addItem.mutate(
              { shopId: shop.id, input: { name: newItem.trim() } },
              { onSuccess: () => setNewItem("") },
            )
          }
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
  onRemove: () => void;
}

function Row({ item, onChange, onRemove }: RowProps) {
  return (
    <li className="grid grid-cols-12 items-center gap-1 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5">
      <input
        className="input col-span-4"
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <input
        className="input col-span-2"
        placeholder="Type"
        value={item.type ?? ""}
        onChange={(e) => onChange({ type: e.target.value || undefined })}
      />
      <input
        className="input col-span-2"
        placeholder="Rarity"
        value={item.rarity ?? ""}
        onChange={(e) => onChange({ rarity: e.target.value || undefined })}
      />
      <input
        type="number"
        className="input col-span-2 text-right"
        placeholder="Price"
        value={item.price ?? ""}
        onChange={(e) =>
          onChange({ price: e.target.value === "" ? undefined : Number(e.target.value) })
        }
      />
      <input
        type="number"
        className="input col-span-1 text-right"
        placeholder="#"
        value={item.stock ?? ""}
        onChange={(e) =>
          onChange({ stock: e.target.value === "" ? undefined : Number(e.target.value) })
        }
      />
      <button className="btn-ghost col-span-1 px-2" onClick={onRemove}>
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
  const [params, setParams] = useState<GenerateShopInput>({
    flavor: "general",
    size: "medium",
    rarityCap: "rare",
  });

  return (
    <div className="flex flex-1 flex-col items-stretch gap-2 p-4 text-sm">
      <p className="text-ink-400">No shop selected. Create one above, or generate:</p>
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
            setParams({
              ...params,
              rarityCap: e.target.value as GenerateShopInput["rarityCap"],
            })
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
        onClick={() => generate.mutate(params, { onSuccess: (s) => onCreated(s.id) })}
        disabled={generate.isPending}
      >
        Generate
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
