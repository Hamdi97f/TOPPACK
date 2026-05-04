export default function ShippingPage() {
  return (
    <div className="container-x py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-kraft-900">Livraison &amp; retours</h1>
      <h2 className="text-xl font-bold text-kraft-900 mt-6">Livraison</h2>
      <p className="mt-2 text-kraft-800">
        La plupart des commandes en stock sont expédiées sous 48 heures. Les commandes
        personnalisées sont généralement expédiées sous 7 à 10 jours ouvrés après
        validation des fichiers d&apos;impression.
      </p>
      <h2 className="text-xl font-bold text-kraft-900 mt-6">Retours</h2>
      <p className="mt-2 text-kraft-800">
        Les produits standard peuvent être retournés sous 30 jours dans leur état
        d&apos;origine. Les cartons personnalisés ne sont pas repris, sauf en cas de
        défaut de fabrication.
      </p>
    </div>
  );
}
