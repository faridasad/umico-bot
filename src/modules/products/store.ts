// src/stores/product-store.ts
import { ProductOffer } from "./types";

export interface ProductsStoreType {
  offers: ProductOffer[];
  meta: {
    totalProducts: number;
    lastUpdated: Date | null;
    isLoading: boolean;
  };
}

// In-memory store for products
const productsStore: ProductsStoreType = {
  offers: [],
  meta: {
    totalProducts: 0,
    lastUpdated: null,
    isLoading: false,
  },
};

export class ProductStoreService {
  static getStore(): ProductsStoreType {
    return { ...productsStore };
  }

  static getOffers(): ProductOffer[] {
    return [...productsStore.offers];
  }

  static getMeta() {
    return { ...productsStore.meta };
  }

  static clearOffers(): void {
    productsStore.offers = [];
  }

  static setLoading(isLoading: boolean): void {
    productsStore.meta.isLoading = isLoading;
  }

  static setTotalProducts(total: number): void {
    productsStore.meta.totalProducts = total;
  }

  static updateLastUpdated(): void {
    productsStore.meta.lastUpdated = new Date();
  }

  static addOffers(offers: ProductOffer[]): void {
    productsStore.offers = [...productsStore.offers, ...offers];
  }

  static setOffers(offers: ProductOffer[]): void {
    productsStore.offers = [...offers];
  }
}
