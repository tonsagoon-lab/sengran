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
  MapPin,
  Image as ImageIcon,
  MessageCircle,
  X,
  Sparkles,
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
import { AIDescriptionHelper } from "@/components/listings/ai-description-helper";
import { RichTextDisplay } from "@/components/rich-text-display";
import { stripHtmlTags } from "@/lib/utils/html";
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

interface Category { id: number; name_th: string; slug: string }
interface Province { id: number; name_th: string; slug: string; region: string }
interface Amenity { id: number; name_th: string; slug: string }

interface WizardProps {
  userId: string;
  categories: Category[];
  provinces: Province[];
  amenities: Amenity[];
  linePackageUrl?: string;
  lineFaakUrl?: string;
  modalTitle?: string;
  modalSubtitle?: string;
  buttonTextPackage?: string;
  buttonTextFaak?: string;
  buttonTextView?: string;
  listing?: ListingWithImages & {
    categories?: { name_th: string; slug: string } | null;
    provinces?: { name_th: string; slug: string } | null;
    listing_amenities?: { amenity_id: number }[];
  };
}

type ListingType = "sale" | "rent" | "both"; // equipment listings use their own wizard

interface WizardState {
  listingId: string;
  // Step 1
  title: string;
  listing_type: ListingType;
  category_id: string;
  sale_price: string;
  promo_type: "" | "percent" | "amount";
  promo_value: string;
  rent_price: string;
  deposit_months: string;
  revenue_amount: string;
  revenue_period: "yearly" | "quarterly_avg" | "monthly_last";
  description: string; // HTML
  // Step 2
  province_id: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  // Step 3
  video_url: string;
  amenity_ids: number[];
  // Step 4
  image_paths: string[];
}

// ── Step schemas ───────────────────────────────────────────────

const step1Schema = z
  .object({
    title: z
      .string()
      .min(10, "กรุณากรอกชื่อประกาศอย่างน้อย 10 ตัวอักษร")
      .max(100, "ชื่อประกาศยาวเกิน 100 ตัวอักษร"),
    listing_type: z.enum(["sale", "rent", "both"]),
    category_id: z.string().min(1, "กรุณาเลือกประเภทกิจการ"),
    description: z.string().min(30, "กรุณากรอกรายละเอียดอย่างน้อย 30 ตัวอักษร"),
    sale_price: z.string().optional(),
    rent_price: z.string().optional(),
    promo_type: z.enum(["", "percent", "amount"]).optional(),
    promo_value: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.listing_type === "sale" || data.listing_type === "both") {
      const n = Number(data.sale_price?.replace(/,/g, "") ?? "");
      if (!data.sale_price?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณากรอกราคาเซ้ง", path: ["sale_price"] });
      } else if (isNaN(n) || n <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ราคาเซ้งต้องเป็นตัวเลขที่มากกว่า 0", path: ["sale_price"] });
      }
    }
    if (data.listing_type === "rent" || data.listing_type === "both") {
      const n = Number(data.rent_price?.replace(/,/g, "") ?? "");
      if (!data.rent_price?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณากรอกราคาเช่า", path: ["rent_price"] });
      } else if (isNaN(n) || n <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ราคาเช่าต้องเป็นตัวเลขที่มากกว่า 0", path: ["rent_price"] });
      }
    }
    if (data.promo_type) {
      if (data.listing_type !== "sale") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "โปรโมชั่นใช้ได้เฉพาะประเภทเซ้ง", path: ["promo_type"] });
        return;
      }
      const v = Number(data.promo_value?.replace(/,/g, "") ?? "");
      if (!data.promo_value?.trim() || isNaN(v) || v <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "กรุณากรอกส่วนลดที่มากกว่า 0", path: ["promo_value"] });
      } else if (data.promo_type === "percent" && v >= 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "เปอร์เซ็นต์ต้องน้อยกว่า 100", path: ["promo_value"] });
      } else if (data.promo_type === "amount") {
        const sale = Number(data.sale_price?.replace(/,/g, "") ?? "");
        if (sale > 0 && v >= sale) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ส่วนลดต้องน้อยกว่าราคาเซ้ง", path: ["promo_value"] });
        }
      }
    }
  });

const step2Schema = z.object({
  province_id: z.string().min(1, "กรุณาเลือกจังหวัด"),
});

// ── Progress bar ───────────────────────────────────────────────

const STEPS = [
  { label: "ข้อมูลพื้นฐาน", icon: Store },
  { label: "ที่ตั้ง", icon: MapPin },
  { label: "รูปภาพ", icon: ImageIcon },
];
const TOTAL_STEPS = STEPS.length; // 3

const DEFAULT_LINE_URL = "https://line.me/R/ti/p/~salebiz";
const MODAL_PACKAGE_IMAGE_URL = "https://fexxmtjmrlpitzsjrgbd.supabase.co/storage/v1/object/public/banners/modal-package.jpg";
const MODAL_FAAK_IMAGE_URL = "https://fexxmtjmrlpitzsjrgbd.supabase.co/storage/v1/object/public/banners/modal-faak.jpg";

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
          <span className="text-sm font-medium">ขั้นตอน {step} / {TOTAL_STEPS}</span>
          <span className="text-sm text-neutral-500">{STEPS[step - 1].label}</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-200 rounded-full">
          <div
            className="h-full bg-orange-500 rounded-full transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

// ── Utilities ──────────────────────────────────────────────────

const STORAGE_KEY = "sengran_wizard_state";

// Feature flag: AI description helper hidden while we evaluate trust concerns
// (auto-generated text may reduce buyer confidence in listing authenticity).
// Flip to true to re-enable both button and modal.
const AI_HELPER_ENABLED = false;

function formatNumberOnBlur(raw: string): string {
  const n = parseFloat(raw.replace(/,/g, ""));
  if (isNaN(n)) return raw;
  return n.toLocaleString("th-TH");
}

function unformat(val: string): string {
  return val.replace(/,/g, "");
}

function buildInitialState(listing?: WizardProps["listing"]): WizardState {
  return {
    listingId: listing?.id ?? crypto.randomUUID(),
    title: listing?.title ?? "",
    listing_type: (listing?.listing_type === "sale" || listing?.listing_type === "rent" || listing?.listing_type === "both") ? listing.listing_type : "sale",
    category_id: listing?.category_id != null ? String(listing.category_id) : "",
    sale_price: listing?.sale_price != null ? String(listing.sale_price) : "",
    promo_type: listing?.promo_type ?? "",
    promo_value: listing?.promo_value != null ? String(listing.promo_value) : "",
    rent_price: listing?.rent_price != null ? String(listing.rent_price) : "",
    deposit_months: listing?.deposit_months != null ? String(listing.deposit_months) : "",
    revenue_amount: listing?.revenue_amount != null ? String(listing.revenue_amount) : "",
    revenue_period: listing?.revenue_period ?? "monthly_last",
    description: listing?.description ?? "",
    province_id: listing?.province_id != null ? String(listing.province_id) : "",
    district: listing?.district ?? "",
    address: listing?.address ?? "",
    latitude: listing?.latitude != null ? String(listing.latitude) : "",
    longitude: listing?.longitude != null ? String(listing.longitude) : "",
    video_url: listing?.video_url ?? "",
    amenity_ids: listing?.listing_amenities?.map((la) => la.amenity_id) ?? [],
    image_paths: [],
  };
}

/** Migrate saved sessionStorage state to the current schema. Returns null on fatal error. */
function migrateState(raw: string, listingId?: string): WizardState | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Must belong to the right listing for edit mode
    if (listingId && parsed.listingId !== listingId) return null;
    // Strip removed fields (price_note, area_sqm) — just ignore them
    // Clamp image_paths to array
    return {
      listingId: parsed.listingId ?? crypto.randomUUID(),
      title: parsed.title ?? "",
      listing_type: ["sale", "rent", "both"].includes(parsed.listing_type)
        ? parsed.listing_type
        : "sale",
      category_id: parsed.category_id ?? "",
      sale_price: parsed.sale_price ?? "",
      promo_type: ["percent", "amount"].includes(parsed.promo_type) ? parsed.promo_type : "",
      promo_value: parsed.promo_value ?? "",
      rent_price: parsed.rent_price ?? "",
      deposit_months: parsed.deposit_months ?? "",
      revenue_amount: parsed.revenue_amount ?? "",
      revenue_period: ["yearly", "quarterly_avg", "monthly_last"].includes(parsed.revenue_period)
        ? parsed.revenue_period
        : "monthly_last",
      description: parsed.description ?? "",
      province_id: parsed.province_id ?? "",
      district: parsed.district ?? "",
      address: parsed.address ?? "",
      latitude: parsed.latitude ?? "",
      longitude: parsed.longitude ?? "",
      video_url: parsed.video_url ?? "",
      amenity_ids: Array.isArray(parsed.amenity_ids) ? parsed.amenity_ids : [],
      image_paths: Array.isArray(parsed.image_paths) ? parsed.image_paths : [],
    };
  } catch {
    return null;
  }
}

// ── Promo section (step 1, sale only) ─────────────────────────

function PromoSection({
  salePrice,
  promoType,
  promoValue,
  errorType,
  errorValue,
  onChange,
}: {
  salePrice: string;
  promoType: "" | "percent" | "amount";
  promoValue: string;
  errorType?: string;
  errorValue?: string;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  const enabled = !!promoType;
  const sale = Number(salePrice);
  const value = Number(unformat(promoValue));
  const discountValid =
    enabled &&
    value > 0 &&
    (promoType === "percent" ? value < 100 : sale > 0 && value < sale);
  const newPrice = !discountValid
    ? null
    : promoType === "percent"
      ? Math.max(0, Math.round(sale - (sale * value) / 100))
      : Math.max(0, sale - value);

  return (
    <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 p-3 space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-neutral-300 accent-orange-500"
          checked={enabled}
          onChange={(e) => {
            if (e.target.checked) {
              onChange({ promo_type: "percent" });
            } else {
              onChange({ promo_type: "", promo_value: "" });
            }
          }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
            <Sparkles className="h-4 w-4 text-orange-500" />
            เปิดใช้งานโปรโมชั่นส่วนลด
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            ประกาศจะแสดงในหมวด &ldquo;โปรโมชั่นล่าสุด&rdquo; โดยคุณต้องปิดเอง
          </p>
        </div>
      </label>

      {enabled && (
        <div className="space-y-2 pl-7">
          <div className="flex flex-wrap items-stretch gap-2">
            <Select
              value={promoType}
              onValueChange={(v: "percent" | "amount") => onChange({ promo_type: v })}
            >
              <SelectTrigger className={`w-32 ${errorType ? "border-red-500" : ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">ส่วนลด %</SelectItem>
                <SelectItem value="amount">ลดเป็นบาท</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[8rem]">
              <Input
                type="text"
                inputMode="numeric"
                value={promoValue}
                onChange={(e) => onChange({ promo_value: e.target.value })}
                onBlur={(e) => onChange({ promo_value: formatNumberOnBlur(e.target.value) })}
                onFocus={(e) => onChange({ promo_value: unformat(e.target.value) })}
                placeholder={promoType === "percent" ? "เช่น 10" : "เช่น 5,000"}
                className={`pr-8 ${errorValue ? "border-red-500" : ""}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                {promoType === "percent" ? "%" : "฿"}
              </span>
            </div>
          </div>
          {(errorType || errorValue) && (
            <p className="text-sm text-red-500">{errorType || errorValue}</p>
          )}
          {newPrice != null && (
            <p className="text-xs text-neutral-600">
              ราคาหลังหักส่วนลด:{" "}
              <span className="line-through text-neutral-400">
                ฿{sale.toLocaleString("th-TH")}
              </span>{" "}
              <span className="font-semibold text-orange-600">
                ฿{newPrice.toLocaleString("th-TH")}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────

export function ListingWizard({
  userId, categories, provinces, amenities, listing,
  linePackageUrl, lineFaakUrl,
  modalTitle, modalSubtitle, buttonTextPackage, buttonTextFaak, buttonTextView,
}: WizardProps) {
  const pkgUrl = linePackageUrl || DEFAULT_LINE_URL;
  const faakUrl = lineFaakUrl || DEFAULT_LINE_URL;
  const successTitle = modalTitle || "ประกาศเผยแพร่แล้ว!";
  const successSubtitle = modalSubtitle || "เลือกขั้นตอนถัดไป";
  const btnPackage = buttonTextPackage || "ซื้อ package เซ้งร้าน";
  const btnFaak = buttonTextFaak || "ฝากเซ้งร้าน";
  const btnView = buttonTextView || "ดูประกาศที่ลง";
  const router = useRouter();
  const isEdit = !!listing;
  const storageKey = isEdit ? `${STORAGE_KEY}_${listing?.id}` : STORAGE_KEY;

  // Always start with default state (matches SSR), then hydrate from sessionStorage
  const [data, setDataRaw] = useState<WizardState>(() => buildInitialState(listing));

  useEffect(() => {
    // New listing: always start fresh
    if (!isEdit) {
      try { sessionStorage.removeItem(storageKey); } catch {}
      return;
    }
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const migrated = migrateState(saved, isEdit ? listing?.id : undefined);
        if (migrated) { setDataRaw(migrated); return; }
        sessionStorage.removeItem(storageKey);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setData = useCallback(
    (updater: Partial<WizardState> | ((prev: WizardState) => WizardState)) => {
      setDataRaw((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [storageKey]
  );

  // Hash-based step navigation (clamped to 1–4, not 1–5)
  function getStepFromHash(): number {
    if (typeof window === "undefined") return 1;
    const match = window.location.hash.match(/step-(\d)/);
    const n = match ? parseInt(match[1]) : 1;
    // Clamp — old #step-5 from previous wizard structure maps to 4
    return Math.max(1, Math.min(TOTAL_STEPS, n));
  }

  const [step, setStepRaw] = useState(1);

  useEffect(() => {
    setStepRaw(getStepFromHash());
    const onHashChange = () => setStepRaw(getStepFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function setStep(n: number) {
    window.location.hash = `step-${n}`;
    setStepRaw(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Existing images from edit mode (needed for image-count validation)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const existingImages =
    listing?.listing_images.map((img) => ({
      id: img.id,
      storage_path: img.storage_path,
      preview_url: `${supabaseUrl}/storage/v1/object/public/listings/${img.storage_path}`,
      display_order: img.display_order,
    })) ?? [];

  function validate(stepNum: number): boolean {
    setErrors({});
    if (stepNum === 1) {
      const result = step1Schema.safeParse({
        title: data.title,
        listing_type: data.listing_type,
        category_id: data.category_id,
        description: stripHtmlTags(data.description),
        sale_price: unformat(data.sale_price),
        rent_price: unformat(data.rent_price),
        promo_type: data.promo_type,
        promo_value: unformat(data.promo_value),
      });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
        setErrors(errs);
        return false;
      }
    }
    if (stepNum === 2) {
      const result = step2Schema.safeParse({ province_id: data.province_id });
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
        setErrors(errs);
        return false;
      }
    }
    if (stepNum === TOTAL_STEPS) {
      const totalImages = existingImages.length + data.image_paths.length;
      if (totalImages < 1) {
        setErrors({ images: "กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป" });
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!validate(step)) return;
    // Clear inapplicable price fields when type changed
    if (step === 1) {
      if (data.listing_type === "rent") setData({ sale_price: "", promo_type: "", promo_value: "" });
      if (data.listing_type === "sale") setData({ rent_price: "", deposit_months: "" });
      if (data.listing_type === "both") setData({ promo_type: "", promo_value: "" });
    }
    setStep(step + 1);
  }

  function prev() {
    if (step > 1) setStep(step - 1);
  }

  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{ quota: number; current: number } | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [aiHelperOpen, setAiHelperOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedCategoryName = categories.find((c) => String(c.id) === data.category_id)?.name_th ?? "";

  function buildFormData(status: "published" | "draft"): FormData {
    const fd = new FormData();
    fd.set("listing_id", data.listingId);
    fd.set("title", data.title);
    fd.set("description", data.description);
    fd.set("listing_type", data.listing_type);
    fd.set("sale_price", unformat(data.sale_price));
    fd.set("rent_price", unformat(data.rent_price));
    if (data.listing_type === "sale" && data.promo_type) {
      fd.set("promo_type", data.promo_type);
      fd.set("promo_value", unformat(data.promo_value));
    }
    fd.set("deposit_months", data.deposit_months);
    fd.set("revenue_amount", unformat(data.revenue_amount));
    fd.set("revenue_period", data.revenue_period);
    fd.set("province_id", data.province_id);
    fd.set("district", data.district);
    fd.set("address", data.address);
    fd.set("latitude", data.latitude);
    fd.set("longitude", data.longitude);
    fd.set("category_id", data.category_id);
    fd.set("video_url", data.video_url);
    fd.set("status", status);
    data.image_paths.forEach((p) => fd.append(isEdit ? "new_image_paths[]" : "image_paths[]", p));
    data.amenity_ids.forEach((id) => fd.append("amenity_ids[]", String(id)));
    return fd;
  }

  function handleSubmit(status: "published" | "draft") {
    if (!validate(TOTAL_STEPS)) return;
    setSubmitError(null);
    startTransition(async () => {
      const fd = buildFormData(status);
      const action = isEdit ? updateListingAction : createListingAction;
      const result = await action(undefined, fd);
      if (result?.quotaExceeded) {
        setQuotaInfo({ quota: result.quota ?? 5, current: result.current ?? 0 });
        setShowQuotaModal(true);
        return;
      }
      if (result?.error) { setSubmitError(result.error); return; }
      try { sessionStorage.removeItem(storageKey); } catch {}
      if (status === "published" && !isEdit) {
        setShowSuccessModal(true);
      } else {
        router.push("/my-listings");
      }
    });
  }

  const initialCoords: Coords | null =
    data.latitude && data.longitude
      ? { lat: Number(data.latitude), lng: Number(data.longitude) }
      : null;

  // Summary helpers
  const provinceName = provinces.find((p) => String(p.id) === data.province_id)?.name_th ?? "—";
  const categoryName = categories.find((c) => String(c.id) === data.category_id)?.name_th ?? "ไม่ระบุ";
  const TYPE_LABELS: Record<ListingType, string> = { sale: "เซ้ง", rent: "ให้เช่า", both: "เซ้งและให้เช่า" };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      <ProgressBar step={step} />

      {/* Draft save button — visible from step 2 onwards */}
      {step >= 2 && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleSubmit("draft")}>
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

      <form ref={formRef} />

      {/* ── Step 1: ข้อมูลพื้นฐาน ───────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardContent className="pt-5 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">ชื่อประกาศ <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => setData({ title: e.target.value })}
                  placeholder="เช่น เซ้งร้านกาแฟ ย่านสีลม ทำเลดี"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
              </div>

              {/* Listing type */}
              <div className="space-y-2">
                <Label>ประเภทการเซ้ง/เช่า <span className="text-red-500">*</span></Label>
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
                        className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all
                          ${active ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 hover:border-orange-300"}`}
                      >
                        <span className="text-xl">{icons[type]}</span>
                        <span className="text-xs sm:text-sm font-medium text-center leading-tight">{labels[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>ประเภทกิจการ <span className="text-red-500">*</span></Label>
                <Select value={data.category_id} onValueChange={(val) => setData({ category_id: val })}>
                  <SelectTrigger className={errors.category_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="เลือกประเภทกิจการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name_th}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && <p className="text-sm text-red-500">{errors.category_id}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Price — visual break before this section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">ราคา</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data.listing_type === "sale" || data.listing_type === "both") && (
                <div className="space-y-2">
                  <Label>ราคาเซ้ง (บาท) <span className="text-red-500">*</span></Label>
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

              {data.listing_type === "sale" && (
                <PromoSection
                  salePrice={unformat(data.sale_price)}
                  promoType={data.promo_type}
                  promoValue={data.promo_value}
                  errorType={errors.promo_type}
                  errorValue={errors.promo_value}
                  onChange={(patch) => setData(patch)}
                />
              )}

              {(data.listing_type === "rent" || data.listing_type === "both") && (
                <>
                  <div className="space-y-2">
                    <Label>ค่าเช่า/เดือน (บาท) <span className="text-red-500">*</span></Label>
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
                    <div className="flex flex-wrap items-center gap-2">
                      {[0, 1, 2, 3].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setData({ deposit_months: String(m) })}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors
                            ${data.deposit_months === String(m)
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-neutral-200 hover:border-orange-300"}`}
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
                        className="w-20"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                รายได้ <span className="font-normal text-neutral-400 normal-case">(ถ้ามี)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {(["monthly_last", "quarterly_avg", "yearly"] as const).map((p) => {
                  const labels = { monthly_last: "เดือนล่าสุด", quarterly_avg: "เฉลี่ย 3 เดือน", yearly: "ต่อปี" };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setData({ revenue_period: p })}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        data.revenue_period === p
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-neutral-200 hover:border-orange-300"
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">฿</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={data.revenue_amount}
                  onChange={(e) => setData({ revenue_amount: e.target.value })}
                  onBlur={(e) => setData({ revenue_amount: formatNumberOnBlur(e.target.value) })}
                  onFocus={(e) => setData({ revenue_amount: unformat(e.target.value) })}
                  placeholder="ใส่รายได้ (ไม่บังคับ)"
                  className="pl-7"
                />
              </div>
            </CardContent>
          </Card>

          {/* Description — visual break */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">รายละเอียด</CardTitle>
              {AI_HELPER_ENABLED && (
                <button
                  type="button"
                  onClick={() => setAiHelperOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI ช่วยเขียน
                </button>
              )}
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={data.description}
                onChange={(html) => setData({ description: html })}
                placeholder="รายละเอียดร้าน สัญญาเช่า อุปกรณ์ที่แถม ฯลฯ (อย่างน้อย 30 ตัวอักษร)"
                error={errors.description}
              />
            </CardContent>
          </Card>

          {AI_HELPER_ENABLED && (
            <AIDescriptionHelper
              open={aiHelperOpen}
              onOpenChange={setAiHelperOpen}
              title={data.title}
              categoryName={selectedCategoryName}
              listingType={data.listing_type}
              salePrice={data.sale_price}
              rentPrice={data.rent_price}
              onAccept={(html) => setData({ description: html })}
            />
          )}
        </div>
      )}

      {/* ── Step 2: ที่ตั้ง ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label>จังหวัด <span className="text-red-500">*</span></Label>
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

      {/* ── Step 3: รูปภาพและตรวจสอบ ───────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
          <Card>
            <CardHeader><CardTitle className="text-base">รูปภาพ</CardTitle></CardHeader>
            <CardContent>
              <ImageUploader
                userId={userId}
                listingId={data.listingId}
                existingImages={existingImages}
                onImagesChange={(paths) => setData({ image_paths: paths })}
              />
              {errors.images && <p className="mt-2 text-sm text-red-500">{errors.images}</p>}
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card>
            <CardHeader><CardTitle className="text-base">สรุปประกาศ</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm overflow-hidden">
              {/* Identity group */}
              <div className="grid grid-cols-[6rem_1fr] gap-y-2 gap-x-4">
                <span className="text-neutral-500">ประเภท</span>
                <span className="font-medium break-words min-w-0">{TYPE_LABELS[data.listing_type]}</span>

                <span className="text-neutral-500">ชื่อประกาศ</span>
                <span className="font-medium break-words min-w-0 line-clamp-2">{data.title}</span>

                <span className="text-neutral-500">ประเภทกิจการ</span>
                <span className="font-medium break-words min-w-0">{categoryName}</span>
              </div>

              <Separator />

              {/* Price group */}
              <div className="grid grid-cols-[6rem_1fr] gap-y-2 gap-x-4">
                {(data.listing_type === "sale" || data.listing_type === "both") && (
                  <>
                    <span className="text-neutral-500">ราคาเซ้ง</span>
                    <span className="font-medium break-words min-w-0">฿{data.sale_price} บาท</span>
                  </>
                )}
                {(data.listing_type === "rent" || data.listing_type === "both") && (
                  <>
                    <span className="text-neutral-500">ค่าเช่า/เดือน</span>
                    <span className="font-medium break-words min-w-0">฿{data.rent_price} บาท</span>
                  </>
                )}
                {(data.listing_type === "rent" || data.listing_type === "both") && data.deposit_months && (
                  <>
                    <span className="text-neutral-500">มัดจำ</span>
                    <span className="font-medium break-words min-w-0">{data.deposit_months} เดือน</span>
                  </>
                )}
              </div>

              <Separator />

              {/* Location group */}
              <div className="grid grid-cols-[6rem_1fr] gap-y-2 gap-x-4">
                <span className="text-neutral-500">จังหวัด</span>
                <span className="font-medium break-words min-w-0">{provinceName}</span>

                {data.district && (
                  <>
                    <span className="text-neutral-500">เขต/อำเภอ</span>
                    <span className="font-medium break-words min-w-0">{data.district}</span>
                  </>
                )}
              </div>

              {/* Google Maps preview */}
              {data.latitude && data.longitude && (
                <div className="rounded-xl overflow-hidden border border-neutral-200">
                  <iframe
                    src={`https://maps.google.com/maps?q=${data.latitude},${data.longitude}&z=15&output=embed`}
                    width="100%"
                    height="180"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="block"
                  />
                </div>
              )}

              <Separator />

              {/* Description preview */}
              <div>
                <p className="text-neutral-500 mb-2">รายละเอียด</p>
                <RichTextDisplay html={data.description} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quota Modal ────────────────────────────────────────── */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <button
              onClick={() => setShowQuotaModal(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-1">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Store className="h-6 w-6 text-orange-500" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900">ถึงขีดจำกัดประกาศแล้ว</h2>
              <p className="text-sm text-neutral-500">คุณมีประกาศครบ {quotaInfo?.quota ?? 5} รายการแล้ว<br />ซื้อเพิ่มได้จาก admin ผ่าน LINE</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">แพ็กเกจเพิ่มโควต้า (ราคาต่อปี)</p>
              {[
                { posts: 20, price: 300 },
                { posts: 50, price: 100 },
                { posts: 100, price: 1000 },
              ].map(({ posts, price }) => (
                <a
                  key={posts}
                  href={pkgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border px-4 py-3 hover:bg-orange-50 hover:border-orange-300 transition-colors"
                >
                  <span className="text-sm font-medium text-neutral-800">เพิ่ม {posts} โพส / ปี</span>
                  <span className="text-sm font-bold text-orange-500">{price.toLocaleString()} ฿</span>
                </a>
              ))}
              <button
                onClick={() => setShowQuotaModal(false)}
                className="w-full py-2 text-sm text-neutral-400 hover:text-neutral-600"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ──────────────────────────────────────── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <button
              onClick={() => { setShowSuccessModal(false); router.push("/my-listings"); }}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
              aria-label="ปิด"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-1">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <h2 className="text-lg font-bold text-neutral-900">{successTitle}</h2>
              <p className="text-sm text-neutral-500">{successSubtitle}</p>
            </div>

            <div className="space-y-3">
              {/* Option 1: ซื้อ package */}
              <a
                href={pkgUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-neutral-200 hover:border-orange-400 hover:shadow-md transition-all"
              >
                {MODAL_PACKAGE_IMAGE_URL && (
                  <img
                    src={MODAL_PACKAGE_IMAGE_URL}
                    alt={btnPackage}
                    className="w-full object-cover"
                  />
                )}
                <div className="bg-orange-500 hover:bg-orange-600 py-2.5 text-center font-semibold text-sm text-white">
                  {btnPackage}
                </div>
              </a>

              {/* Option 2: ฝากเซ้งร้าน */}
              <a
                href={faakUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-neutral-200 hover:border-green-400 hover:shadow-md transition-all"
              >
                {MODAL_FAAK_IMAGE_URL && (
                  <img
                    src={MODAL_FAAK_IMAGE_URL}
                    alt={btnFaak}
                    className="w-full object-cover"
                  />
                )}
                <div className="bg-[#06C755] py-2.5 text-center font-semibold text-sm text-white">
                  {btnFaak}
                </div>
              </a>

              {/* Option 3: ดูประกาศที่ลง */}
              <button
                onClick={() => { setShowSuccessModal(false); router.push("/my-listings"); }}
                className="w-full py-2.5 text-sm text-neutral-500 hover:text-neutral-700 hover:underline transition-colors"
              >
                {btnView}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom navigation ──────────────────────────────────── */}
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

        {step < TOTAL_STEPS ? (
          <Button type="button" onClick={next} className="bg-orange-500 hover:bg-orange-600 text-white">
            ถัดไป
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => handleSubmit("draft")}>
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
              {isEdit && listing?.status === "published" ? "บันทึกการแก้ไข" : "เผยแพร่ประกาศ"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
