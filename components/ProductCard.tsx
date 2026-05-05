import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number;
  regularPrice: number | null;
  promoPrice: number | null;
  imageUrl: string | null;
  wallType: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const hasPromo = p.promoPrice != null && p.regularPrice != null;
  return (
    <Link href={`/products/${p.slug}`} className="card overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
      <div className="aspect-square bg-kraft-100 flex items-center justify-center text-6xl relative">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span aria-hidden>📦</span>
        )}
        {hasPromo && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
            Promo
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-kraft-600">{p.wallType}</div>
        <div className="font-semibold text-kraft-900 group-hover:text-kraft-700">{p.name}</div>
        <div className="text-xs text-kraft-600 mt-1">
          {p.lengthCm} × {p.widthCm} × {p.heightCm} cm
        </div>
        <div className="mt-auto pt-3">
          {hasPromo ? (
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-red-700">{formatPrice(p.price)}</span>
              <span className="text-sm text-kraft-500 line-through">{formatPrice(p.regularPrice!)}</span>
            </div>
          ) : (
            <span className="font-bold text-kraft-800">{formatPrice(p.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
