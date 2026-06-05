/**
 * Copy text to the clipboard, with a fallback for insecure contexts.
 *
 * `navigator.clipboard` is only available in secure contexts (HTTPS or
 * `localhost`). When the GM serves the app over a plain-HTTP LAN address so
 * players can join, the async Clipboard API is `undefined` and copying the
 * join code / links silently fails. In that case we fall back to a hidden
 * `<textarea>` + `document.execCommand("copy")`, which still works over HTTP.
 *
 * Returns `true` on success, `false` if both strategies fail.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Keep it out of view and avoid scrolling/zoom jumps on mobile.
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
