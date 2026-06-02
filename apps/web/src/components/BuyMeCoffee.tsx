/** Small support link to the maintainer's Buy Me a Coffee page. */
export function BuyMeCoffee() {
  return (
    <a
      href="https://buymeacoffee.com/axpico"
      target="_blank"
      rel="noopener noreferrer"
      className="btn-ghost inline-flex items-center gap-1.5 whitespace-nowrap"
      title="Support the developer"
    >
      <span aria-hidden>☕</span>
      <span className="hidden sm:inline">Buy me a coffee</span>
    </a>
  );
}
