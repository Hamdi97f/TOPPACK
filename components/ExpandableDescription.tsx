"use client";

import { useId, useState } from "react";

type ExpandableDescriptionProps = {
  text: string;
  /** Maximum number of characters to show before truncating. Defaults to 250. */
  maxLength?: number;
  className?: string;
};

/**
 * Renders a description that is automatically truncated when it exceeds
 * `maxLength` characters. A "Plus d'infos" button reveals the full text,
 * and a "Moins d'infos" button collapses it back.
 */
export function ExpandableDescription({
  text,
  maxLength = 250,
  className = "mt-4 text-kraft-800 whitespace-pre-line",
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  const trimmed = text?.trim() ?? "";
  if (!trimmed) return null;

  const isLong = trimmed.length > maxLength;

  if (!isLong) {
    return <p className={className}>{trimmed}</p>;
  }

  // Truncate on a word boundary when possible to avoid cutting words in half.
  let preview = trimmed.slice(0, maxLength);
  const lastSpace = preview.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    preview = preview.slice(0, lastSpace);
  }
  preview = preview.replace(/[\s.,;:!?-]+$/u, "");

  return (
    <div>
      <p id={contentId} className={className}>
        {expanded ? trimmed : `${preview}…`}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="mt-2 text-sm font-medium text-kraft-700 hover:text-kraft-900 underline underline-offset-2"
      >
        {expanded ? "Moins d'infos" : "Plus d'infos"}
      </button>
    </div>
  );
}
