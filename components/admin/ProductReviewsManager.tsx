"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonOrSignOut } from "@/lib/client-fetch";
import {
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
  type ReviewRecord,
} from "@/lib/reviews";

function StarsDisplay({ rating }: { rating: number }) {
  const safe = Math.max(REVIEW_RATING_MIN, Math.min(REVIEW_RATING_MAX, Math.round(rating)));
  return (
    <span aria-label={`Note : ${safe} sur ${REVIEW_RATING_MAX}`} className="text-amber-500">
      {"★".repeat(safe)}
      <span className="text-kraft-300">{"★".repeat(REVIEW_RATING_MAX - safe)}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ProductReviewsManager({
  productId,
  initialReviews,
}: {
  productId: string;
  initialReviews: ReviewRecord[];
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewRecord[]>(initialReviews);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState<number>(REVIEW_RATING_MAX);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!authorName.trim()) {
      setError("Veuillez renseigner le nom du client.");
      return;
    }
    if (!comment.trim()) {
      setError("Veuillez renseigner le commentaire.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(productId)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName: authorName.trim(), rating, comment: comment.trim() }),
        }
      );
      const data = await readJsonOrSignOut<{ review: ReviewRecord }>(res);
      if (data?.review) {
        setReviews((prev) => [data.review, ...prev]);
      }
      setAuthorName("");
      setComment("");
      setRating(REVIEW_RATING_MAX);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'ajout de l'avis");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer cet avis ?")) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(productId)}/reviews/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      await readJsonOrSignOut<{ success: boolean }>(res);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="card p-6 space-y-6 max-w-3xl">
      <header>
        <h2 className="text-xl font-bold text-kraft-900">Avis clients</h2>
        <p className="text-sm text-kraft-700 mt-1">
          Ajoutez des avis qui seront affichés publiquement sur la page produit.
        </p>
      </header>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-3 border-b border-kraft-200 pb-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="reviewAuthor">Nom du client</label>
            <input
              id="reviewAuthor"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={120}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="reviewRating">Note</label>
            <select
              id="reviewRating"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="select"
            >
              {Array.from({ length: REVIEW_RATING_MAX }, (_, i) => REVIEW_RATING_MAX - i).map((n) => (
                <option key={n} value={n}>
                  {n} {n > 1 ? "étoiles" : "étoile"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="reviewComment">Commentaire</label>
          <textarea
            id="reviewComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={3}
            required
            className="textarea"
          />
        </div>
        <div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Ajout…" : "Ajouter l'avis"}
          </button>
        </div>
      </form>

      <div>
        <h3 className="font-semibold text-kraft-900 mb-3">
          Avis publiés ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-kraft-600">Aucun avis pour ce produit.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="border border-kraft-200 rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-kraft-900">{r.authorName}</div>
                    <div className="text-xs text-kraft-600 mt-0.5">
                      <StarsDisplay rating={r.rating} /> · {formatDate(r.createdAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="text-sm text-red-700 hover:text-red-800 disabled:opacity-50"
                  >
                    {deletingId === r.id ? "Suppression…" : "Supprimer"}
                  </button>
                </div>
                <p className="text-sm text-kraft-800 mt-2 whitespace-pre-wrap">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
