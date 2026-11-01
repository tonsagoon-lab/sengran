// Server-only Thai administrative divisions lookup (province → amphure → tambon).
// Dataset: kongvut/thai-province-data (public, Creative Commons).

import amphuresRaw from "@/data/thai-amphures.json";
import tambonsRaw from "@/data/thai-tambons.json";
import provincesRaw from "@/data/thai-provinces.json";

export type ThaiProvince = {
  id: number;
  name_th: string;
  name_en: string;
};

export type ThaiAmphure = {
  id: number;
  name_th: string;
  name_en: string;
  province_id: number;
};

export type ThaiTambon = {
  id: number;
  zip_code: number;
  name_th: string;
  name_en: string;
  amphure_id: number;
};

const PROVINCES = provincesRaw as ThaiProvince[];
const AMPHURES = amphuresRaw as ThaiAmphure[];
const TAMBONS = tambonsRaw as ThaiTambon[];

// name_th → id maps (lowercase, prefix-stripped keys for fuzzy match)
function normalizeName(s: string): string {
  return s
    .replace(/^(จังหวัด|อำเภอ|เขต|ตำบล|แขวง)\s*/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

const PROVINCE_BY_NAME = new Map<string, ThaiProvince>();
for (const p of PROVINCES) PROVINCE_BY_NAME.set(normalizeName(p.name_th), p);

const AMPHURES_BY_PROVINCE = new Map<number, ThaiAmphure[]>();
for (const a of AMPHURES) {
  const arr = AMPHURES_BY_PROVINCE.get(a.province_id) ?? [];
  arr.push(a);
  AMPHURES_BY_PROVINCE.set(a.province_id, arr);
}

const TAMBONS_BY_AMPHURE = new Map<number, ThaiTambon[]>();
for (const t of TAMBONS) {
  const arr = TAMBONS_BY_AMPHURE.get(t.amphure_id) ?? [];
  arr.push(t);
  TAMBONS_BY_AMPHURE.set(t.amphure_id, arr);
}

export function findProvinceByName(name: string): ThaiProvince | null {
  const key = normalizeName(name);
  return PROVINCE_BY_NAME.get(key) ?? null;
}

export function getAmphuresByProvinceName(provinceName: string): ThaiAmphure[] {
  const p = findProvinceByName(provinceName);
  if (!p) return [];
  return AMPHURES_BY_PROVINCE.get(p.id) ?? [];
}

export function findAmphureByName(provinceName: string, amphureName: string): ThaiAmphure | null {
  const amphures = getAmphuresByProvinceName(provinceName);
  const key = normalizeName(amphureName);
  return amphures.find((a) => normalizeName(a.name_th) === key) ?? null;
}

export function getTambonsByAmphureId(amphureId: number): ThaiTambon[] {
  return TAMBONS_BY_AMPHURE.get(amphureId) ?? [];
}

export function findTambonByName(amphureId: number, tambonName: string): ThaiTambon | null {
  const tambons = getTambonsByAmphureId(amphureId);
  const key = normalizeName(tambonName);
  return tambons.find((t) => normalizeName(t.name_th) === key) ?? null;
}
