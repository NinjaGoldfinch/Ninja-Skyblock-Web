import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getItems } from "@/api/endpoints";
import type { ItemV2 } from "@/types/api";

const ROMAN: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
  6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X",
};

function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function formatProductId(productId: string): string {
  // ENCHANTMENT_ULTIMATE_CHIMERA_5 → "Ultimate Chimera V"
  // ENCHANTMENT_SHARPNESS_7 → "Sharpness VII"
  const enchMatch = productId.match(/^ENCHANTMENT_(.+?)_(\d+)$/);
  if (enchMatch) {
    const name = titleCase(enchMatch[1]!);
    const level = ROMAN[Number(enchMatch[2])] ?? enchMatch[2]!;
    return `${name} ${level}`;
  }

  // ESSENCE_DRAGON → "Dragon Essence"
  const essenceMatch = productId.match(/^ESSENCE_(.+)$/);
  if (essenceMatch) {
    return `${titleCase(essenceMatch[1]!)} Essence`;
  }

  return titleCase(productId);
}

/**
 * Fetches the items database and returns a function to resolve
 * bazaar product IDs to proper display names.
 * Falls back to title-cased product ID if the item isn't in the DB.
 */
export function useItemNames() {
  const { data: itemsResp } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
    staleTime: 5 * 60 * 1000,
  });

  const rawData = itemsResp?.data as unknown as { items: ItemV2[]; count: number } | ItemV2[] | undefined;
  const items: ItemV2[] | undefined = Array.isArray(rawData) ? rawData : rawData?.items;

  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!items) return map;
    for (const item of items) {
      map.set(item.id, item.name);
    }
    return map;
  }, [items]);

  const getName = useMemo(
    () => (productId: string): string => nameMap.get(productId) ?? formatProductId(productId),
    [nameMap],
  );

  return { getName, isLoaded: nameMap.size > 0 };
}
