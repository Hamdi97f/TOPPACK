import { apiClient } from "@/lib/api-client";

export const revalidate = 300;

export default async function ContactPage() {
  const settings = await apiClient.getSiteSettings();
  const c = settings.contact;
  return (
    <div className="container-x py-12 max-w-2xl">
      <h1 className="text-3xl font-bold text-kraft-900">Contact</h1>
      <p className="mt-4 text-kraft-800">
        Vous avez une question ou besoin d&apos;un devis personnalisé ? Contactez-nous,
        notre équipe vous répondra sous un jour ouvré.
      </p>
      <ul className="mt-6 space-y-2 text-kraft-800">
        {c.email && (
          <li>
            <strong>E-mail :</strong>{" "}
            <a href={`mailto:${c.email}`} className="underline hover:text-kraft-700">{c.email}</a>
          </li>
        )}
        {c.phone && (
          <li>
            <strong>Téléphone :</strong>{" "}
            <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="underline hover:text-kraft-700">{c.phone}</a>
          </li>
        )}
        {c.address && (
          <li>
            <strong>Adresse :</strong>{" "}
            <span className="whitespace-pre-line">{c.address}</span>
          </li>
        )}
        {c.hours && <li><strong>Horaires :</strong> {c.hours}</li>}
      </ul>
      {c.mapUrl && (
        <p className="mt-6">
          <a href={c.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex">
            Voir sur la carte
          </a>
        </p>
      )}
    </div>
  );
}
