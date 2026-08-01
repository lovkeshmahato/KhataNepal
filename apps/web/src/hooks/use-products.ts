"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  sellingPrice: number;
  costPrice: number;
  reorderLevel: number;
  category: { id: string; name: string };
  unit: { id: string; name: string; abbreviation: string };
  vatRate: { id: string; name: string; rate: number };
}

export function useProducts(search: string) {
  return useQuery({
    queryKey: ["products", search],
    queryFn: () => api.get<Product[]>(`/products${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    staleTime: 30_000,
  });
}

export function useProductByBarcode(barcode: string | null) {
  return useQuery({
    queryKey: ["product-barcode", barcode],
    queryFn: () => api.get<Product>(`/products/barcode/${encodeURIComponent(barcode!)}`),
    enabled: !!barcode,
    retry: false,
  });
}
