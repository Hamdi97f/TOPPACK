"use client";

import { useEffect } from "react";

/**
 * Client-only overlay injected into the storefront when an admin browses with
 * the `toppack_edit_mode=1` cookie set. Highlights elements carrying a
 * `data-edit-id` attribute on hover and posts a `{type:"toppack:select", id}`
 * message to the parent window when one is clicked.
 *
 * The cookie is set by the admin live-edit page before it loads the iframe.
 * Because an attacker setting the cookie themselves only gets a visual hover
 * outline (the data-edit-id markers are rendered for everyone, just inertly),
 * this is safe to inject on the public layout.
 *
 * The overlay does NOT mutate persisted content — Save / Discard happen
 * exclusively through the admin UI in the parent window.
 */
export function LiveEditOverlay() {
  useEffect(() => {
    // No-op outside an iframe — the storefront stays untouched when the page
    // is loaded directly (e.g. an admin who set the cookie and then navigated
    // to / by hand).
    if (typeof window === "undefined" || window.parent === window) return;

    const STYLE_ID = "toppack-live-edit-style";
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        [data-edit-id] { position: relative; }
        [data-edit-id]:hover { outline: 2px dashed #3b82f6; outline-offset: 2px; cursor: pointer; }
        [data-edit-id][data-edit-selected="true"] { outline: 2px solid #2563eb; outline-offset: 2px; }
      `;
      document.head.appendChild(style);
    }

    let lastSelected: Element | null = null;

    function findEditable(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof Element)) return null;
      return target.closest<HTMLElement>("[data-edit-id]");
    }

    function onClick(e: MouseEvent) {
      const el = findEditable(e.target);
      if (!el) return;
      const id = el.getAttribute("data-edit-id");
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      if (lastSelected) lastSelected.removeAttribute("data-edit-selected");
      el.setAttribute("data-edit-selected", "true");
      lastSelected = el;
      try {
        window.parent.postMessage({ type: "toppack:select", id }, window.location.origin);
      } catch {
        /* ignore */
      }
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { type?: string; id?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "toppack:highlight" && typeof data.id === "string") {
        if (lastSelected) lastSelected.removeAttribute("data-edit-selected");
        const el = document.querySelector<HTMLElement>(
          `[data-edit-id="${CSS.escape(data.id)}"]`
        );
        if (el) {
          el.setAttribute("data-edit-selected", "true");
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          lastSelected = el;
        }
      }
    }

    // Use capture so we win against component-level click handlers (the
    // header cart button, product cards, etc.) and prevent navigation.
    document.addEventListener("click", onClick, true);
    window.addEventListener("message", onMessage);

    // Tell the parent we are ready so it can push the initial selection.
    try {
      window.parent.postMessage({ type: "toppack:ready" }, window.location.origin);
    } catch {
      /* ignore */
    }

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
