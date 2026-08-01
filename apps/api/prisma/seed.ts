import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ROLE_PERMISSIONS, SYSTEM_ROLES } from "@khatanepal/types";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "ChangeMe123!";

async function main() {
  console.log("Seeding KhataNepal demo data...");

  const org = await prisma.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: {
      id: "demo-org",
      name: "KhataNepal Demo Supermarket",
      legalName: "KhataNepal Demo Supermarket Pvt. Ltd.",
      panNumber: "301234567",
      address: "Durbarmarg, Kathmandu, Nepal",
      phone: "01-4123456",
      email: "info@khatanepal.demo",
      defaultVatRate: 13,
      currency: "NPR",
    },
  });

  const [branchKtm, branchPkr] = await Promise.all([
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: "KTM01" } },
      update: {},
      create: { orgId: org.id, name: "Kathmandu — Durbarmarg", code: "KTM01", address: "Durbarmarg, Kathmandu" },
    }),
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: "PKR01" } },
      update: {},
      create: { orgId: org.id, name: "Pokhara — Lakeside", code: "PKR01", address: "Lakeside, Pokhara" },
    }),
  ]);

  // ─── Roles ────────────────────────────────────────────────────────────
  const roleByName = new Map<string, { id: string }>();
  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { orgId_name: { orgId: org.id, name: roleName } },
      update: { permissions: ROLE_PERMISSIONS[roleName] },
      create: {
        orgId: org.id,
        name: roleName,
        isSystem: true,
        permissions: ROLE_PERMISSIONS[roleName],
      },
    });
    roleByName.set(roleName, role);
  }

  // ─── Chart of accounts ───────────────────────────────────────────────
  const accounts = [
    { code: "1000", name: "Cash on Hand", type: "ASSET" as const },
    { code: "1010", name: "Bank / Digital Wallet Settlement", type: "ASSET" as const },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" as const },
    { code: "1200", name: "Inventory", type: "ASSET" as const },
    { code: "1300", name: "VAT Receivable (Input)", type: "ASSET" as const },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" as const },
    { code: "2100", name: "VAT Payable (Output)", type: "LIABILITY" as const },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" as const },
    { code: "4000", name: "Sales Revenue", type: "REVENUE" as const },
    { code: "4100", name: "Sales Discounts", type: "REVENUE" as const },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const },
    { code: "5100", name: "Operating Expenses", type: "EXPENSE" as const },
  ];
  for (const account of accounts) {
    await prisma.account.upsert({
      where: { orgId_code: { orgId: org.id, code: account.code } },
      update: {},
      create: { ...account, orgId: org.id, isSystem: true },
    });
  }

  // ─── Users ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const demoUsers = [
    { email: "owner@khatanepal.demo", fullName: "Rojina Shrestha", role: "OWNER" as const, branches: [branchKtm, branchPkr] },
    { email: "manager@khatanepal.demo", fullName: "Bikash Thapa", role: "BRANCH_MANAGER" as const, branches: [branchKtm] },
    { email: "cashier@khatanepal.demo", fullName: "Anisha Gurung", role: "CASHIER" as const, branches: [branchKtm] },
    { email: "inventory@khatanepal.demo", fullName: "Sujan Karki", role: "INVENTORY_CLERK" as const, branches: [branchKtm, branchPkr] },
    { email: "accountant@khatanepal.demo", fullName: "Prakash Adhikari", role: "ACCOUNTANT" as const, branches: [] },
  ];

  for (const u of demoUsers) {
    const role = roleByName.get(u.role)!;
    await prisma.user.upsert({
      where: { orgId_email: { orgId: org.id, email: u.email } },
      update: {},
      create: {
        orgId: org.id,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        isActive: true,
        roles: { create: [{ roleId: role.id }] },
        branches: { create: u.branches.map((b) => ({ branchId: b.id })) },
      },
    });
  }

  // ─── Catalog reference data ──────────────────────────────────────────
  const units = [
    { name: "Piece", abbreviation: "pcs" },
    { name: "Kilogram", abbreviation: "kg" },
    { name: "Litre", abbreviation: "ltr" },
    { name: "Packet", abbreviation: "pkt" },
  ];
  const unitByAbbr = new Map<string, { id: string }>();
  for (const unit of units) {
    const created = await prisma.unit.upsert({
      where: { orgId_abbreviation: { orgId: org.id, abbreviation: unit.abbreviation } },
      update: {},
      create: { ...unit, orgId: org.id },
    });
    unitByAbbr.set(unit.abbreviation, created);
  }

  const vatStandard = await prisma.vatRate.upsert({
    where: { orgId_name: { orgId: org.id, name: "Standard 13%" } },
    update: {},
    create: { orgId: org.id, name: "Standard 13%", rate: 13, isDefault: true },
  });
  const vatExempt = await prisma.vatRate.upsert({
    where: { orgId_name: { orgId: org.id, name: "VAT Exempt" } },
    update: {},
    create: { orgId: org.id, name: "VAT Exempt", rate: 0 },
  });

  const categoryNames = ["Grocery", "Beverages", "Dairy & Eggs", "Household", "Snacks & Confectionery", "Personal Care"];
  const categoryByName = new Map<string, { id: string }>();
  for (const name of categoryNames) {
    const existing = await prisma.category.findFirst({ where: { orgId: org.id, name, parentId: null } });
    const created = existing ?? (await prisma.category.create({ data: { orgId: org.id, name } }));
    categoryByName.set(name, created);
  }

  const products = [
    { sku: "GRC-RICE-5KG", name: "Basmati Rice 5kg", category: "Grocery", unit: "pkt", cost: 650, price: 750, vat: vatExempt, reorder: 20 },
    { sku: "GRC-DAL-1KG", name: "Masoor Dal 1kg", category: "Grocery", unit: "pkt", cost: 180, price: 220, vat: vatExempt, reorder: 30 },
    { sku: "GRC-OIL-1L", name: "Sunflower Cooking Oil 1L", category: "Grocery", unit: "ltr", cost: 320, price: 375, vat: vatStandard, reorder: 25 },
    { sku: "GRC-SUGAR-1KG", name: "Sugar 1kg", category: "Grocery", unit: "pkt", cost: 105, price: 130, vat: vatExempt, reorder: 30 },
    { sku: "GRC-SALT-1KG", name: "Iodized Salt 1kg", category: "Grocery", unit: "pkt", cost: 25, price: 35, vat: vatExempt, reorder: 40 },
    { sku: "BEV-COKE-500ML", name: "Coca-Cola 500ml", category: "Beverages", unit: "pcs", cost: 40, price: 60, vat: vatStandard, reorder: 60 },
    { sku: "BEV-TEA-100G", name: "Nepal Tea Leaves 100g", category: "Beverages", unit: "pkt", cost: 90, price: 120, vat: vatStandard, reorder: 25 },
    { sku: "BEV-WATER-1L", name: "Mineral Water 1L", category: "Beverages", unit: "pcs", cost: 15, price: 25, vat: vatStandard, reorder: 100 },
    { sku: "DRY-MILK-1L", name: "Fresh Milk 1L", category: "Dairy & Eggs", unit: "ltr", cost: 80, price: 95, vat: vatExempt, reorder: 40 },
    { sku: "DRY-EGG-TRAY", name: "Eggs (Tray of 30)", category: "Dairy & Eggs", unit: "pcs", cost: 380, price: 430, vat: vatExempt, reorder: 15 },
    { sku: "DRY-CHEESE-200G", name: "Processed Cheese 200g", category: "Dairy & Eggs", unit: "pkt", cost: 220, price: 260, vat: vatStandard, reorder: 15 },
    { sku: "HH-DETERGENT-1KG", name: "Detergent Powder 1kg", category: "Household", unit: "pkt", cost: 150, price: 190, vat: vatStandard, reorder: 20 },
    { sku: "HH-DISHSOAP-500ML", name: "Dish Soap 500ml", category: "Household", unit: "pcs", cost: 85, price: 110, vat: vatStandard, reorder: 25 },
    { sku: "SNK-CHIPS-50G", name: "Potato Chips 50g", category: "Snacks & Confectionery", unit: "pkt", cost: 25, price: 40, vat: vatStandard, reorder: 60 },
    { sku: "SNK-BISCUIT-100G", name: "Glucose Biscuits 100g", category: "Snacks & Confectionery", unit: "pkt", cost: 20, price: 30, vat: vatStandard, reorder: 60 },
    { sku: "SNK-CHOCO-BAR", name: "Chocolate Bar 45g", category: "Snacks & Confectionery", unit: "pcs", cost: 60, price: 90, vat: vatStandard, reorder: 40 },
    { sku: "PC-SOAP-100G", name: "Bath Soap 100g", category: "Personal Care", unit: "pcs", cost: 35, price: 50, vat: vatStandard, reorder: 40 },
    { sku: "PC-SHAMPOO-180ML", name: "Shampoo 180ml", category: "Personal Care", unit: "pcs", cost: 140, price: 175, vat: vatStandard, reorder: 20 },
    { sku: "PC-TOOTHPASTE-100G", name: "Toothpaste 100g", category: "Personal Care", unit: "pcs", cost: 65, price: 85, vat: vatStandard, reorder: 30 },
    { sku: "GRC-FLOUR-2KG", name: "Wheat Flour 2kg", category: "Grocery", unit: "pkt", cost: 150, price: 180, vat: vatExempt, reorder: 25 },
  ];

  const createdProducts: { id: string; sku: string; reorderLevel: number }[] = [];
  for (const p of products) {
    const created = await prisma.product.upsert({
      where: { orgId_sku: { orgId: org.id, sku: p.sku } },
      update: {},
      create: {
        orgId: org.id,
        sku: p.sku,
        name: p.name,
        barcode: `890${Math.abs(hashCode(p.sku)).toString().slice(0, 10)}`,
        categoryId: categoryByName.get(p.category)!.id,
        unitId: unitByAbbr.get(p.unit)!.id,
        vatRateId: p.vat.id,
        costPrice: p.cost,
        sellingPrice: p.price,
        reorderLevel: p.reorder,
      },
    });
    createdProducts.push({ id: created.id, sku: created.sku, reorderLevel: created.reorderLevel });
  }

  // ─── Initial stock ───────────────────────────────────────────────────
  for (const branch of [branchKtm, branchPkr]) {
    for (const product of createdProducts) {
      const initialQty = Math.round(product.reorderLevel * (1.5 + Math.random()));
      await prisma.stockItem.upsert({
        where: { branchId_productId: { branchId: branch.id, productId: product.id } },
        update: {},
        create: { branchId: branch.id, productId: product.id, quantity: initialQty },
      });
      await prisma.stockMovement.create({
        data: {
          branchId: branch.id,
          productId: product.id,
          type: "ADJUSTMENT_IN",
          quantity: initialQty,
          balanceAfter: initialQty,
          referenceType: "seed",
          note: "Initial stock load",
        },
      });
    }
  }

  // ─── Suppliers ───────────────────────────────────────────────────────
  const suppliers = [
    { name: "Bhatbhateni Wholesale Distributors", phone: "01-4444444", panNumber: "301111111" },
    { name: "Himalayan FMCG Traders", phone: "01-4555555", panNumber: "301222222" },
  ];
  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { id: `seed-${s.panNumber}` },
      update: {},
      create: { id: `seed-${s.panNumber}`, orgId: org.id, ...s },
    });
  }

  // ─── Cash registers ──────────────────────────────────────────────────
  for (const branch of [branchKtm, branchPkr]) {
    const existing = await prisma.cashRegister.findFirst({ where: { branchId: branch.id } });
    if (!existing) {
      await prisma.cashRegister.create({ data: { branchId: branch.id, name: `${branch.code} Counter 1` } });
    }
  }

  // ─── Sample customer ─────────────────────────────────────────────────
  await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      orgId: org.id,
      name: "Walk-in Loyalty Member",
      phone: "9801234567",
      loyaltyPoints: 120,
    },
  });

  console.log("\nSeed complete. Demo login credentials (password for all):", DEMO_PASSWORD);
  for (const u of demoUsers) console.log(`  ${u.role.padEnd(16)} ${u.email}`);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
