import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  wallType: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <Link href={`/products/${p.slug}`} className="card overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
      <div className="aspect-square bg-kraft-100 flex items-center justify-center text-6xl">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span aria-hidden>📦</span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-kraft-600">{p.wallType}</div>
        <div className="font-semibold text-kraft-900 group-hover:text-kraft-700">{p.name}</div>
        <div className="text-xs text-kraft-600 mt-1">
          {p.lengthCm} × {p.widthCm} × {p.heightCm} cm
        </div>
        <div className="mt-auto pt-3 font-bold text-kraft-800">{formatPrice(p.price)}</div>
      </div>
    </Link>
  );
}
