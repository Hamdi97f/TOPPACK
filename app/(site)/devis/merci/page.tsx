import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DevisMerciPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  return (
    <div className="container-x py-16 max-w-2xl text-center">
      <h1 className="text-3xl font-bold text-kraft-900">Demande envoyée ✅</h1>
      <p className="mt-4 text-kraft-800">
        Merci pour votre demande de devis. Notre équipe vous contactera très
        prochainement.
      </p>
      {ref && (
        <p className="mt-4 text-kraft-700">
          Votre référence : <span className="font-mono font-semibold">{ref}</span>
        </p>
      )}
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/" className="btn-secondary">Retour à l&apos;accueil</Link>
        <Link href="/products" className="btn-primary">Voir la boutique</Link>
      </div>
    </div>
  );
}
