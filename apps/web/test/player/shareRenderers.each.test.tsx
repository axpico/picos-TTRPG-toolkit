import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getShareRenderer } from "../../src/player/shareRenderers.js";

afterEach(cleanup);

function renderShare(type: string, data: unknown, widgetKey = `${type}:w1`) {
  const Renderer = getShareRenderer(type);
  return render(<Renderer data={data} widgetKey={widgetKey} />);
}

describe("share renderers", () => {
  it("npc: renders name, role, quirk and tags", () => {
    renderShare("npc", {
      name: "Mirt",
      role: "Moneylender",
      quirk: "Counts coins twice",
      tags: ["rich", "gruff"],
      portraitAssetId: null,
    });
    expect(screen.getByText("Mirt")).toBeTruthy();
    expect(screen.getByText("Moneylender")).toBeTruthy();
    expect(screen.getByText(/Counts coins twice/)).toBeTruthy();
    expect(screen.getByText("rich")).toBeTruthy();
  });

  it("bestiary: renders name, CR subtitle and stat chips", () => {
    renderShare("bestiary", {
      name: "Owlbear",
      type: "Monstrosity",
      environment: "forest",
      challenge: "3",
      tags: [],
      stats: { ac: 13, hp: 59, hpMax: 59, speed: "40 ft.", abilities: {}, traits: [], actions: [] },
    });
    expect(screen.getByText("Owlbear")).toBeTruthy();
    expect(screen.getByText(/CR 3/)).toBeTruthy();
    expect(screen.getByText("AC 13")).toBeTruthy();
    expect(screen.getByText("HP 59/59")).toBeTruthy();
  });

  it("shop: renders items with price and stock, and an empty message", () => {
    renderShare("shop", {
      name: "The Gilded Flask",
      items: [
        { id: "i1", name: "Potion", type: null, price: 50, stock: 3, rarity: "common", tags: [] },
      ],
    });
    expect(screen.getByText(/The Gilded Flask/)).toBeTruthy();
    expect(screen.getByText("Potion")).toBeTruthy();
    expect(screen.getByText("50g")).toBeTruthy();
    expect(screen.getByText("×3")).toBeTruthy();

    cleanup();
    renderShare("shop", { name: "Empty", items: [] });
    expect(screen.getByText("Nothing in stock.")).toBeTruthy();
  });

  it("sessions: renders title, summary and links", () => {
    renderShare("sessions", {
      title: "Session 12",
      date: "2026-06-01T00:00:00Z",
      summary: "The heist went sideways.",
      externalLinks: [{ label: "Map", href: "https://example.com/map" }],
    });
    expect(screen.getByText("Session 12")).toBeTruthy();
    expect(screen.getByText("The heist went sideways.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Map/ })).toBeTruthy();
  });

  it("log: renders entries and an empty message", () => {
    renderShare("log", [
      { id: "e1", kind: "session", message: "The party rests.", createdAt: "2026-06-01T18:00:00Z" },
    ]);
    expect(screen.getByText("The party rests.")).toBeTruthy();

    cleanup();
    renderShare("log", []);
    expect(screen.getByText("No entries yet.")).toBeTruthy();
  });

  it("sticky: renders title and text with the note color", () => {
    renderShare("sticky", { text: "Remember the password", title: "Note", color: "#fde68a", fontSize: null });
    expect(screen.getByText("Note")).toBeTruthy();
    expect(screen.getByText("Remember the password")).toBeTruthy();
  });

  it("falls back to a generic card for unknown types", () => {
    renderShare("mystery", {}, "mystery:w9");
    expect(screen.getByText(/The GM is sharing/)).toBeTruthy();
    expect(screen.getByText(/mystery/)).toBeTruthy();
  });
});
