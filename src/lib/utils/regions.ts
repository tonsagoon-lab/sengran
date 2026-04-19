export interface Region {
  slug: string;
  name_th: string;
  name_en: string;
}

export const REGIONS: Region[] = [
  { slug: "north", name_th: "ภาคเหนือ", name_en: "Northern Thailand" },
  { slug: "northeast", name_th: "ภาคตะวันออกเฉียงเหนือ", name_en: "Northeastern Thailand" },
  { slug: "central", name_th: "ภาคกลาง", name_en: "Central Thailand" },
  { slug: "east", name_th: "ภาคตะวันออก", name_en: "Eastern Thailand" },
  { slug: "west", name_th: "ภาคตะวันตก", name_en: "Western Thailand" },
  { slug: "south", name_th: "ภาคใต้", name_en: "Southern Thailand" },
];

export function getRegionBySlug(slug: string): Region | undefined {
  return REGIONS.find((r) => r.slug === slug);
}
