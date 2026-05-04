export default function ContactPage() {
  return (
    <div className="container-x py-12 max-w-2xl">
      <h1 className="text-3xl font-bold text-kraft-900">Contact</h1>
      <p className="mt-4 text-kraft-800">
        Vous avez une question ou besoin d&apos;un devis personnalisé ? Contactez-nous,
        notre équipe vous répondra sous un jour ouvré.
      </p>
      <ul className="mt-6 space-y-2 text-kraft-800">
        <li><strong>E-mail :</strong> support@toppack.local</li>
        <li><strong>Téléphone :</strong> +1 (555) 010-2030</li>
        <li><strong>Horaires :</strong> Lun.–Ven., 9h–18h</li>
      </ul>
    </div>
  );
}
