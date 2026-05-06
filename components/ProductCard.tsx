import Image from "next/image";
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

// Card grid layout: 2 cols on mobile, 3 on lg, 4 on xl. Tell Next.js so it can
// pick the right responsive variant instead of always shipping the largest one.
const CARD_IMAGE_SIZES = "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw";

export function ProductCard({ p, priority = false }: { p: ProductCardData; priority?: boolean }) {
  const hasPromo = p.promoPrice != null && p.regularPrice != null;
  return (
    <Link href={`/products/${p.slug}`} className="card overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
      <div className="aspect-square bg-kraft-100 flex items-center justify-center text-6xl relative">
        {p.imageUrl ? (
          <Image
            src={p.imageUrl}
            alt={p.name}
            fill
            sizes={CARD_IMAGE_SIZES}
            className="object-cover"
            priority={priority}
            // Non-priority cards default to lazy in next/image, which is what we want.
          />
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
