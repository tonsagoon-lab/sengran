"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  DollarSign,
  MapPin,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextDisplay, stripHtmlTags } from "@/components/rich-text-display";
import { ProvinceCombobox } from "@/components/listings/province-combobox";
import { ImageUploader } from "@/components/listings/image-uploader";
import { GoogleMapsInput } from "@/components/google-maps-input";
import {
  createListingAction,
  updateListingAction,
} from "@/lib/actions/listings";
import type { Coords } from "@/lib/utils/google-maps";
import type { ListingWithImages } from "@/lib/db/listings";

// ── Types ──────────────────────────────────────────────────────

interface Category {
  id: number;
  name_th: string;
  slug: string;
}

interface Province {
  id: number;
  name_th: string;
  slug: string;
  region: string;
}

interface Amenity {
  id: number;
  name_th: string;
  slug: string;
}

interface WizardProps {
  userId: string;
  categories: Category[];
  provinces: Province[];
  amenities: Amenity[];
  listing?: ListingWithImages & {
    categories?: { name_th: string; slug: string } | null;
    provinces?: { name_th: string; slug: string } | null;
    listing_amenities?: { amenity_id: number }[];
  };
}

type ListingType = "sale" | "rent" | "both";

interface WizardState {
  listingId: string;
  // Step 1
  listing_type: ListingType;
  title: string;
  description: string; // HTML
  // Step 2
  sale_price: string;
  rent_price: string;
  deposit_months: string;
  price_note: string;
  // Step 3
  province_id: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  // Step 4
  category_id: string;
  area_sqm: string;
  video_url: string;
  amenity_ids: number[];
  // Step 5
  image_paths: string[];
}

// ── Step schemas ───────────────────────────────────────────────

const step1Schema = z.object({
  title: z.string().min(5, "กรุณากรอกชื่อประกาศอย่างน้อย 5 ตัวอักษร").max(200),
  listing_type: z.enum(["sale", "rent", "both"]),
  description: z.string().min(30, "กรุณากรอกรายละเอียดอย่างน้อย 30 ตัวอักษร"),
});

const step2Schema = z
  .object({
    listing_type: z.enum(["sale", "rent", "both"]),
    sale_price: z.string().optional(),
    rent_price: z.string().optional(),
    deposit_months: z.string().optional(),
    price_note: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.listing_type === "sale" || data.listing_type === "both") {
      if (!data.sale_price?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณากรอกราคาเซ้ง", path: ["sale_price"] });
      } else if (isNaN(Number(data.sale_price)) || Number(data.sale_price) < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ราคาเซ้งต้องเป็นตัวเลขที่มากกว่า 0", path: ["sale_price"] });
      }
    }
    if (data.listing_type === "rent" || data.listing_type === "both") {
      if (!data.rent_price?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณากรอกราคาเช่า", path: ["rent_price"] });
      } else if (isNaN(Number(data.rent_price)) || Number(data.rent_price) < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ราคาเช่าต้องเป็นตัวเลขที่มากกว่า 0", path: ["rent_price"] });
      }
    }
  });

const step3Schema = z.object({
  province_id: z.string().min(1, "กรุณาเลือกจังหวัด"),
});

// Steps 4 & 5 have no required fields

// ── Progress indicator ─────────────────────────────────────────

const STEPS = [
  { label: "ข้อมูลพื้นฐาน", icon: Store },
  { label: "ราคา", icon: DollarSign },
  { label: "ที่ตั้ง", icon: MapPin },
  { label: "รายละเอียดเพิ่มเติม", icon: Info },
  { label: "รูปภาพ", icon: ImageIcon },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <>
      {/* Desktop: numbered circles */}
      <div className="hidden sm:flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => {
          const num = idx + 1;
          const done = num < step;
          const active = num === step;
          return (
            <div key={num} className="flex flex-col items-center gap-1 flex-1">
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 ${done ? "bg-orange-500" : "bg-neutral-200"}`} />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shrink-0
                    ${done ? "bg-orange-500 text-white" : active ? "bg-orange-500 text-white ring-2 ring-orange-200" : "bg-neutral-100 text-neutral-400"}`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : num}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${active || done ? "bg-orange-200" : "bg-neutral-200"}`} />
                )}
              </div>
              <span className={`text-xs ${active ? "text-orange-600 font-medium" : "text-neutral-400"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: text + progress bar */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">ขั้นตอน {step} / {STEPS.length}</span>
          <span className="text-sm text-neutral-500">{STEPS[step - 1].label}</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-200 rounded-full">
          <div
            className="h-full bg-orange-500 rounded-full transition-all"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

// ── Utility ────────────────────────────────────────────────────

const STORAGE_KEY = "sengran_wizard_state";

function formatNumberOnBlur(raw: string): string {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (isNaN(n)) return raw;
  return n.toLocaleString("th-TH");
}

function unformat(val: string): string {
  return val.replace(/,/g, "");
}

// ── Main wizard ────────────────────────────────────────────────

export function ListingWizard({
  userId,
  categories,
  provinces,
  amenities,
  listing,
}: WizardProps) {
  const router = useRouter();
  const isEdit = !!listing;
  const storageKey = isEdit ? `${STORAGE_KEY}_${listing?.id}` : STORAGE_KEY;

  function buildInitial(): WizardState {
    return {
      listingId: listing?.id ?? crypto.randomUUID(),
      listing_type: listing?.listing_type ?? "rent",
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      sale_price: listing?.sale_price != null ? String(listing.sale_price) : "",
      rent_price: listing?.rent_price != null ? String(listing.rent_price) : "",
      deposit_months: listing?.deposit_months != null ? String(listing.deposit_months) : "",
      price_note: listing?.price_note ?? "",
      province_id: listing?.province_id != null ? String(listing.province_id) : "",
      district: listing?.district ?? "",
      address: listing?.address ?? "",
      latitude: listing?.latitude != null ? String(listing.latitude) : "",
      longitude: listing?.longitude != null ? String(listing.longitude) : "",
      category_id: listing?.category_id != null ? String(listing.category_id) : "",
      area_sqm: listing?.area_sqm != null ? String(listing.area_sqm) : "",
      video_url: listing?.video_url ?? "",
      amenity_ids: listing?.listing_amenities?.map((la) => la.amenity_id) ?? [],
      image_paths: [],
    };
  }

  const [data, setDataRaw] = useState<WizardState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as WizardState;
          // Don't restore if it's a different listing id
          if (!isEdit || parsed.listingId === listing?.id) return parsed;
        }
      } catch {}
    }
    return buildInitial();
  });

  const setData = useCallback(
    (updater: Partial<WizardState> | ((prev: WizardState) => WizardState)) => {
      setDataRaw((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [storageKey]
  );

  // Hash-based step navigation
  function getStepFromHash(): number {
    if (typeof window === "undefined") return 1;
    const match = window.location.hash.match(/step-(\d)/);
    const n = match ? parseInt(match[1]) : 1;
    return Math.max(1, Math.min(5, n));
  }

  const [step, setStepRaw] = useState(1);

  useEffect(() => {
    setStepRaw(getStepFromHash());
    function onHashChange() {
      setStepRaw(getStepFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function setStep(n: number) {
    window.location.hash = `step-${n}`;
    setStepRaw(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Errors per field
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(stepNum: number): boolean {
    setErrors({});
    if (stepNum === 1) {
      const result = step1Schema.safeParse({
        title: data.title,
        listing_type: data.listing_type,
        description: stripHtmlTags(data.description),
      });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach((i) => {
          const key = i.path[0] as string;
          errs[key] = i.message;
        });
        setErrors(errs);
        return false;
      }
    }
    if (stepNum === 2) {
      const result = step2Schema.safeParse({
        listing_type: data.listing_type,
        sale_price: unformat(data.sale_price),
        rent_price: unformat(data.rent_price),
        deposit_months: data.deposit_months,
        price_note: data.price_note,
      });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach((i) => {
          const key = i.path[0] as string;
          errs[key] = i.message;
        });
        setErrors(errs);
        return false;
      }
    }
    if (stepNum === 3) {
      const result = step3Schema.safeParse({ province_id: data.province_id });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach((i) => {
          errs[i.path[0] as string] = i.message;
        });
        setErrors(errs);
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validate(step)) return;
    // Clear price fields that no longer apply when type changes
    if (step === 1) {
      if (data.listing_type === "rent") setData({ sale_price: "" });
      if (data.listing_type === "sale") setData({ rent_price: "", deposit_months: "" });
    }
    setStep(step + 1);
  }

  function prev() {
    if (step > 1) setStep(step - 1);
  }

  // Submit
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function buildFormData(status: "published" | "draft"): FormData {
    const fd = new FormData();
    fd.set("listing_id", data.listingId);
    fd.set("title", data.title);
    fd.set("description", data.description);
    fd.set("listing_type", data.listing_type);
    fd.set("sale_price", unformat(data.sale_price));
    fd.set("rent_price", unformat(data.rent_price));
    fd.set("deposit_months", data.deposit_months);
    fd.set("price_note", data.price_note);
    fd.set("province_id", data.province_id);
    fd.set("district", data.district);
    fd.set("address", data.address);
    fd.set("latitude", data.latitude);
    fd.set("longitude", data.longitude);
    fd.set("category_id", data.category_id);
    fd.set("area_sqm", data.area_sqm);
    fd.set("video_url", data.video_url);
    fd.set("status", status);
    data.image_paths.forEach((p) => {
      fd.append(isEdit ? "new_image_paths[]" : "image_paths[]", p);
    });
    data.amenity_ids.forEach((id) => {
      fd.append("amenity_ids[]", String(id));
    });
    return fd;
  }

  function handleSubmit(status: "published" | "draft") {
    if (!validate(5)) return;
    setSubmitError(null);
    startTransition(async () => {
      const fd = buildFormData(status);
      const action = isEdit ? updateListingAction : createListingAction;
      const result = await action(undefined, fd);
      if (result?.error) {
        setSubmitError(result.error);
        return;
      }
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      router.push("/my-listings");
    });
  }

  const initialCoords: Coords | null =
    data.latitude && data.longitude
      ? { lat: Number(data.latitude), lng: Number(data.longitude) }
      : null;

  // ── Transition styles ──────────────────────────────────────
  const transitionClass = "transition-all duration-200 ease-in-out";

  // ── Existing images for edit ───────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const existingImages =
    listing?.listing_images.map((img) => ({
      id: img.id,
      storage_path: img.storage_path,
      preview_url: `${supabaseUrl}/storage/v1/object/public/listings/${img.storage_path}`,
      display_order: img.display_order,
    })) ?? [];

  // ── Summary helpers ────────────────────────────────────────
  const provinceName = provinces.find((p) => String(p.id) === data.province_id)?.name_th ?? "—";
  const categoryName = categories.find((c) => String(c.id) === data.category_id)?.name_th ?? "ไม่ระบุ";
  const TYPE_LABELS: Record<ListingType, string> = {
    sale: "เซ้ง",
    rent: "ให้เช่า",
    both: "เซ้งและให้เช่า",
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className={transitionClass}>
      <ProgressBar step={step} />

      {/* Header draft save button (step 2+) */}
      {step >= 2 && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleSubmit("draft")}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            บันทึกแบบร่าง
          </Button>
        </div>
      )}

      {submitError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Hidden form needed for submit */}
      <form ref={formRef} />

      {/* ── Step 1: ข้อมูลพื้นฐาน ─────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardHeader><CardTitle className="text-base">ประเภทการเซ้ง/เช่า</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {(["sale", "rent", "both"] as ListingType[]).map((type) => {
                  const labels = { sale: "เซ้ง", rent: "ให้เช่า", both: "เซ้งและให้เช่า" };
                  const icons = { sale: "🏪", rent: "🔑", both: "✨" };
                  const active = data.listing_type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setData({ listing_type: type })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                        ${active ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 hover:border-orange-300"}`}
                    >
                      <span className="text-2xl">{icons[type]}</span>
                      <span className="text-sm font-medium">{labels[type]}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">ชื่อประกาศ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อประกาศ *</Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => setData({ title: e.target.value })}
                  placeholder="เช่น เซ้งร้านกาแฟ ย่านสีลม ทำเลดี"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">รายละเอียด *</CardTitle></CardHeader>
            <CardContent>
              <RichTextEditor
                value={data.description}
                onChange={(html) => setData({ description: html })}
                placeholder="รายละเอียดร้าน สัญญาเช่า อุปกรณ์ที่แถม ฯลฯ (อย่างน้อย 30 ตัวอักษร)"
                error={errors.description}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 2: ราคา ──────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardHeader><CardTitle className="text-base">ราคา</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(data.listing_type === "sale" || data.listing_type === "both") && (
                <div className="space-y-2">
                  <Label>ราคาเซ้ง (บาท) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">฿</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={data.sale_price}
                      onChange={(e) => setData({ sale_price: e.target.value })}
                      onBlur={(e) => setData({ sale_price: formatNumberOnBlur(e.target.value) })}
                      onFocus={(e) => setData({ sale_price: unformat(e.target.value) })}
                      placeholder="0"
                      className={`pl-7 ${errors.sale_price ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.sale_price && <p className="text-sm text-red-500">{errors.sale_price}</p>}
                </div>
              )}

              {(data.listing_type === "rent" || data.listing_type === "both") && (
                <>
                  <div className="space-y-2">
                    <Label>ค่าเช่า/เดือน (บาท) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">฿</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={data.rent_price}
                        onChange={(e) => setData({ rent_price: e.target.value })}
                        onBlur={(e) => setData({ rent_price: formatNumberOnBlur(e.target.value) })}
                        onFocus={(e) => setData({ rent_price: unformat(e.target.value) })}
                        placeholder="0"
                        className={`pl-7 ${errors.rent_price ? "border-red-500" : ""}`}
                      />
                    </div>
                    {errors.rent_price && <p className="text-sm text-red-500">{errors.rent_price}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>มัดจำ (เดือน)</Label>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setData({ deposit_months: String(m) })}
                          className={`px-4 py-2 rounded-lg border text-sm transition-colors
                            ${data.deposit_months === String(m) ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 hover:border-orange-300"}`}
                        >
                          {m} เดือน
                        </button>
                      ))}
                      <Input
                        type="number"
                        min="0"
                        max="12"
                        value={data.deposit_months}
                        onChange={(e) => setData({ deposit_months: e.target.value })}
                        placeholder="อื่นๆ"
                        className="w-24"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>หมายเหตุราคา</Label>
                <Input
                  value={data.price_note}
                  onChange={(e) => setData({ price_note: e.target.value })}
                  placeholder="เช่น ราคานี้รวมอุปกรณ์ทั้งหมด"
                  maxLength={200}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 3: ที่ตั้ง ───────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardHeader><CardTitle className="text-base">ที่ตั้ง</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>จังหวัด *</Label>
                <ProvinceCombobox
                  provinces={provinces}
                  value={data.province_id}
                  onChange={(val) => setData({ province_id: val })}
                  error={errors.province_id}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">เขต/อำเภอ</Label>
                <Input
                  id="district"
                  value={data.district}
                  onChange={(e) => setData({ district: e.target.value })}
                  placeholder="เขตบางรัก"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">ที่อยู่/รายละเอียดที่ตั้ง</Label>
                <Textarea
                  id="address"
                  value={data.address}
                  onChange={(e) => setData({ address: e.target.value })}
                  placeholder="ใกล้ BTS สีลม ชั้น G ตรงข้ามห้าง..."
                  rows={3}
                />
              </div>

              <GoogleMapsInput
                initialCoords={initialCoords}
                onChange={(coords) => {
                  setData({
                    latitude: coords ? String(coords.lat) : "",
                    longitude: coords ? String(coords.lng) : "",
                  });
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 4: รายละเอียดเพิ่มเติม ──────────────────── */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardHeader><CardTitle className="text-base">รายละเอียดเพิ่มเติม</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ประเภทกิจการ *</Label>
                <Select
                  value={data.category_id}
                  onValueChange={(val) => setData({ category_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทกิจการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_sqm">พื้นที่ใช้สอย (ตร.ม.)</Label>
                <Input
                  id="area_sqm"
                  type="number"
                  min="0"
                  value={data.area_sqm}
                  onChange={(e) => setData({ area_sqm: e.target.value })}
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">ลิงก์วิดีโอ (YouTube / TikTok)</Label>
                <Input
                  id="video_url"
                  type="url"
                  value={data.video_url}
                  onChange={(e) => setData({ video_url: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>

              {amenities.length > 0 && (
                <div className="space-y-2">
                  <Label>สิ่งอำนวยความสะดวก</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {amenities.map((a) => {
                      const checked = data.amenity_ids.includes(a.id);
                      return (
                        <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setData((prev) => ({
                                ...prev,
                                amenity_ids: v
                                  ? [...prev.amenity_ids, a.id]
                                  : prev.amenity_ids.filter((id) => id !== a.id),
                              }));
                            }}
                          />
                          <span className="text-sm">{a.name_th}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 5: รูปภาพและตรวจสอบ ────────────────────── */}
      {step === 5 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardHeader><CardTitle className="text-base">รูปภาพ</CardTitle></CardHeader>
            <CardContent>
              <ImageUploader
                userId={userId}
                listingId={data.listingId}
                existingImages={existingImages}
                onImagesChange={(paths) => setData({ image_paths: paths })}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">สรุปประกาศ</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <span className="text-neutral-500">ประเภท</span>
                <span className="font-medium">{TYPE_LABELS[data.listing_type]}</span>

                <span className="text-neutral-500">ชื่อประกาศ</span>
                <span className="font-medium line-clamp-2">{data.title}</span>

                {(data.listing_type === "sale" || data.listing_type === "both") && (
                  <>
                    <span className="text-neutral-500">ราคาเซ้ง</span>
                    <span className="font-medium">฿{data.sale_price} บาท</span>
                  </>
                )}
                {(data.listing_type === "rent" || data.listing_type === "both") && (
                  <>
                    <span className="text-neutral-500">ค่าเช่า/เดือน</span>
                    <span className="font-medium">฿{data.rent_price} บาท</span>
                  </>
                )}

                <span className="text-neutral-500">จังหวัด</span>
                <span className="font-medium">{provinceName}</span>

                {data.district && (
                  <>
                    <span className="text-neutral-500">เขต/อำเภอ</span>
                    <span className="font-medium">{data.district}</span>
                  </>
                )}

                <span className="text-neutral-500">ประเภทกิจการ</span>
                <span className="font-medium">{categoryName}</span>

                {data.area_sqm && (
                  <>
                    <span className="text-neutral-500">พื้นที่</span>
                    <span className="font-medium">{data.area_sqm} ตร.ม.</span>
                  </>
                )}

                {(data.latitude && data.longitude) && (
                  <>
                    <span className="text-neutral-500">พิกัด GPS</span>
                    <span className="font-medium">
                      {Number(data.latitude).toFixed(4)}, {Number(data.longitude).toFixed(4)}
                    </span>
                  </>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-neutral-500 mb-2">รายละเอียด</p>
                <RichTextDisplay html={data.description} />
              </div>

              {data.amenity_ids.length > 0 && (
                <div>
                  <p className="text-neutral-500 mb-2">สิ่งอำนวยความสะดวก</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.amenity_ids.map((id) => {
                      const a = amenities.find((am) => am.id === id);
                      return a ? (
                        <Badge key={id} variant="secondary">{a.name_th}</Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Bottom navigation ─────────────────────────────── */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={prev}
          className={step === 1 ? "invisible" : ""}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          ย้อนกลับ
        </Button>

        {step < 5 ? (
          <Button
            type="button"
            onClick={next}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            ถัดไป
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleSubmit("draft")}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกแบบร่าง
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => handleSubmit("published")}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "บันทึกการแก้ไข" : "เผยแพร่ประกาศ"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
