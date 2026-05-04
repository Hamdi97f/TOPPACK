import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@toppack.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";
  const adminName = process.env.ADMIN_NAME || "TOPPACK Admin";

  // Admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash, name: adminName },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${adminEmail} / ${adminPassword}`);

  // Categories
  const categoriesData = [
    { name: "Single Wall Boxes", slug: "single-wall-boxes", description: "Lightweight boxes ideal for low to medium-weight items." },
    { name: "Double Wall Boxes", slug: "double-wall-boxes", description: "Stronger boxes for heavier or fragile shipments." },
    { name: "Custom Printed", slug: "custom-printed", description: "Branded corrugated boxes with your logo and colors." },
    { name: "Mailer Boxes", slug: "mailer-boxes", description: "Stylish self-locking boxes for e-commerce shipping." },
  ];

  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
    categories[c.slug] = cat.id;
  }

  // Products
  const products = [
    { name: "Small Single Wall Box 20x15x10", slug: "small-single-wall-20x15x10", sku: "SW-201510",
      description: "Compact single wall corrugated box ideal for books, cosmetics and accessories.",
      lengthCm: 20, widthCm: 15, heightCm: 10, wallType: "Single Wall", price: 0.95, stock: 500,
      categorySlug: "single-wall-boxes", isFeatured: true },
    { name: "Medium Single Wall Box 30x20x15", slug: "medium-single-wall-30x20x15", sku: "SW-302015",
      description: "Versatile mid-size single wall box for general shipping.",
      lengthCm: 30, widthCm: 20, heightCm: 15, wallType: "Single Wall", price: 1.40, stock: 400,
      categorySlug: "single-wall-boxes" },
    { name: "Large Single Wall Box 40x30x20", slug: "large-single-wall-40x30x20", sku: "SW-403020",
      description: "Large single wall box for clothing, soft goods and lightweight items.",
      lengthCm: 40, widthCm: 30, heightCm: 20, wallType: "Single Wall", price: 1.95, stock: 350 ,
      categorySlug: "single-wall-boxes"},
    { name: "Small Double Wall Box 25x20x15", slug: "small-double-wall-25x20x15", sku: "DW-252015",
      description: "Heavy-duty double wall box for fragile items and longer shipments.",
      lengthCm: 25, widthCm: 20, heightCm: 15, wallType: "Double Wall", price: 1.85, stock: 300,
      categorySlug: "double-wall-boxes", isFeatured: true },
    { name: "Medium Double Wall Box 40x30x25", slug: "medium-double-wall-40x30x25", sku: "DW-403025",
      description: "Strong mid-size double wall box for heavier products.",
      lengthCm: 40, widthCm: 30, heightCm: 25, wallType: "Double Wall", price: 2.75, stock: 250,
      categorySlug: "double-wall-boxes" },
    { name: "Large Double Wall Box 60x40x40", slug: "large-double-wall-60x40x40", sku: "DW-604040",
      description: "Extra large double wall corrugated box for industrial and bulk shipping.",
      lengthCm: 60, widthCm: 40, heightCm: 40, wallType: "Double Wall", price: 4.50, stock: 150,
      categorySlug: "double-wall-boxes" },
    { name: "Custom Printed Logo Box (Medium)", slug: "custom-printed-logo-box-medium", sku: "CP-MED-01",
      description: "Branded medium box, fully customizable with your logo and color scheme. Minimum order 100 units.",
      lengthCm: 30, widthCm: 25, heightCm: 15, wallType: "Single Wall", price: 2.20, stock: 1000,
      categorySlug: "custom-printed", isFeatured: true },
    { name: "Custom Printed Logo Box (Large)", slug: "custom-printed-logo-box-large", sku: "CP-LRG-01",
      description: "Branded large box for premium product packaging.",
      lengthCm: 45, widthCm: 35, heightCm: 25, wallType: "Double Wall", price: 3.75, stock: 800,
      categorySlug: "custom-printed" },
    { name: "Mailer Box Small", slug: "mailer-box-small", sku: "MB-SM-01",
      description: "Self-locking mailer box, perfect for subscription boxes and direct-to-consumer shipping.",
      lengthCm: 22, widthCm: 16, heightCm: 8, wallType: "Single Wall", price: 1.30, stock: 600,
      categorySlug: "mailer-boxes", isFeatured: true },
    { name: "Mailer Box Large", slug: "mailer-box-large", sku: "MB-LG-01",
      description: "Larger self-locking mailer box with premium feel.",
      lengthCm: 35, widthCm: 25, heightCm: 12, wallType: "Single Wall", price: 1.95, stock: 500,
      categorySlug: "mailer-boxes" },
  ];

  for (const p of products) {
    const { categorySlug, ...data } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...data, categoryId: categories[categorySlug] },
      create: { ...data, categoryId: categories[categorySlug] },
    });
  }

  console.log(`Seeded ${categoriesData.length} categories and ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
