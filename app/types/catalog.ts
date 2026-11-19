import type { Product } from "~~/shared/types";

export type ProductListItem = Omit<Product, "components" | "variations">;
