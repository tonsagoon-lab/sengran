"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Package, MapPin, ImageIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ProvinceCombobox } from "@/components/listings/province-combobox";
import { ImageUploader } from "@/components/listings/image-uploader";
import { GoogleMapsInput } from "@/components/google-maps-input";
import { RichTextDisplay } from "@/components/rich-text-display";
import { createEquipmentListingAction } from "@/lib/actions/equipment";
import type { EquipmentCategory } from "@/lib/db/equipment";
import type { Coords } from "@/lib/utils/google-maps";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

interface Province { id: number; name_th: string; slug: string; region: string }

interface WizardProps {
  userId: string;
  categories: EquipmentCategory[];
  provinces: Province[];
}

type EquipmentCondition = "new" | "used";

interface WizardState {
  listingId: string;
  // Step 1
  shop_type_ids: number[];
  title: string;
  condition: EquipmentCondition | "";
  price: string;
  description: string;
  // Step 2
  province_id: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  // Step 3
  image_paths: string[];
}

const CONDITION_OPTIONS: { value: EquipmentCondition; label: string; desc: string; color: string }[] = [
  { value: "new",  label: "มือ 1", desc: "สินค้าใหม่ ยังไม่ผ่านการใช้งาน", color: "border-green-400 bg-green-50 text-green-800" },
  { value: "used", label: "มือ 2", desc: "ผ่านการใช้งานแล้ว ยังใช้งานได้ดี", color: "border-blue-400 bg-blue-50 text-blue-800" },
];

// ── Step schemas ──────────────────────────────────────────────

const step1Schema = z.object({
  shop_type_ids: z.array(z.number()).min(1, "กรุณาเลือกอย่างน้อย 1 ประเภทร้าน").max(4, "เลือกได้ไม่เกิน 4 ประเภท"),
  title: z.string().min(5, "ชื่อสินค้าต้องมีอย่างน้อย 5 ตัวอักษร").max(120, "ชื่อสินค้าไม่เกิน 120 ตัวอักษร"),
  condition: z.enum(["new", "used"] as const, { error: "กรุณาเลือกสภาพสินค้า" }),
  price: z.string().min(1, "กรุณาระบุราคา"),
  description: z.string().min(10, "กรุณาอธิบายสินค้าอย่างน้อย 10 ตัวอักษร"),
});

const step2Schema = z.object({
  province_id: z.string().min(1, "กรุณาเลือกจังหวัด"),
  district: z.string().optional(),
  address: z.string().optional(),
});

const STEP_ICONS = [Package, MapPin, ImageIcon];
const STEP_LABELS = ["รายละเอียดสินค้า", "ที่ตั้ง", "รูปภาพ"];
const SESSION_KEY = "equipment_wizard_state";

function defaultState(): WizardState {
  return {
    listingId: crypto.randomUUID(),
    shop_type_ids: [],
    title: "",
    condition: "",
    price: "",
    description: "",
    province_id: "",
    district: "",
    address: "",
    latitude: "",
    longitude: "",
    image_paths: [],
  };
}

// ── Main wizard ───────────────────────────────────────────────

export function EquipmentWizard({ userId, categories, provinces }: WizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<WizardState>(() => {
    if (typeof window === "undefined") return defaultState();
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved) as WizardState;
    } catch { /* ignore */ }
    return defaultState();
  });

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  // Persist to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setErrors({});
  }, []);

  // ── Step 1 validation ─────────────────────────────────────
  const validateStep1 = () => {
    const parsed = step1Schema.safeParse({
      shop_type_ids: state.shop_type_ids,
      title: state.title,
      condition: state.condition || undefined,
      price: state.price,
      description: state.description,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const parsed = step2Schema.safeParse({
      province_id: state.province_id,
      district: state.district,
      address: state.address,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = (publish: boolean) => {
    if (state.image_paths.length === 0) {
      setErrors({ image_paths: "กรุณาอัพโหลดรูปภาพอย่างน้อย 1 รูป" });
      return;
    }
    setServerError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("listing_id", state.listingId);
      fd.set("shop_type_ids", JSON.stringify(state.shop_type_ids));
      fd.set("title", state.title);
      fd.set("condition", state.condition);
      fd.set("price", state.price);
      fd.set("description", state.description);
      fd.set("province_id", state.province_id);
      fd.set("district", state.district);
      fd.set("address", state.address);
      if (state.latitude) fd.set("latitude", state.latitude);
      if (state.longitude) fd.set("longitude", state.longitude);
      state.image_paths.forEach((p) => fd.append("image_paths[]", p));
      fd.set("status", publish ? "published" : "draft");

      const result = await createEquipmentListingAction(undefined, fd);
      if (result?.error) {
        setServerError(result.error);
      } else if (result?.success) {
        sessionStorage.removeItem(SESSION_KEY);
        router.push(`/equipment/${result.listingId}`);
      }
    });
  };

  // ── Progress bar ──────────────────────────────────────────
  const Progress = () => (
    <div className="flex items-center gap-2 mb-6">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const Icon = STEP_ICONS[i];
        const active = step === num;
        const done = step > num;
        return (
          <div key={num} className="flex items-center gap-1 flex-1">
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
              active ? "border-orange-500 bg-orange-500 text-white" : done ? "border-orange-400 bg-orange-100 text-orange-600" : "border-neutral-300 text-neutral-400"
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : num}
            </div>
            <span className={cn(
              "hidden sm:inline text-xs font-medium",
              active ? "text-orange-600" : done ? "text-orange-500" : "text-neutral-400"
            )}>
              <Icon className="inline h-3 w-3 mr-0.5" />{label}
            </span>
            {num < 3 && <div className={cn("flex-1 h-0.5", done ? "bg-orange-400" : "bg-neutral-200")} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Progress />

      {/* ── Step 1: รายละเอียดสินค้า ─────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Shop type multi-select */}
            <div className="space-y-1.5">
              <Label>
                เหมาะกับร้านประเภท (เลือกได้ 1-4) <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = state.shop_type_ids.includes(c.id);
                  const maxReached = state.shop_type_ids.length >= 4 && !selected;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={maxReached}
                      onClick={() => {
                        const next = selected
                          ? state.shop_type_ids.filter((id) => id !== c.id)
                          : [...state.shop_type_ids, c.id];
                        update({ shop_type_ids: next });
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        selected
                          ? "border-orange-500 bg-orange-500 text-white"
                          : maxReached
                          ? "border-neutral-200 text-neutral-300 cursor-not-allowed"
                          : "border-neutral-300 text-neutral-700 hover:border-orange-400 hover:text-orange-600"
                      )}
                    >
                      {c.name_th}
                    </button>
                  );
                })}
              </div>
              {errors.shop_type_ids && <p className="text-xs text-red-500">{errors.shop_type_ids}</p>}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">ชื่อสินค้า <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                value={state.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="เช่น เตาแก๊สหัวเดี่ยว ยี่ห้อ Rinnai"
                maxLength={120}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label>สภาพสินค้า <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {CONDITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ condition: opt.value })}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-all",
                      state.condition === opt.value
                        ? opt.color + " border-current"
                        : "border-neutral-200 hover:border-neutral-300"
                    )}
                  >
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {errors.condition && <p className="text-xs text-red-500">{errors.condition}</p>}
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label htmlFor="price">ราคา (บาท) <span className="text-red-500">*</span></Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={state.price}
                onChange={(e) => update({ price: e.target.value })}
                placeholder="เช่น 5000"
              />
              {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">รายละเอียด <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                value={state.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="อธิบายสภาพ ขนาด ยี่ห้อ รุ่น หรือข้อมูลเพิ่มเติม..."
                rows={5}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: ที่ตั้ง ───────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-1.5">
              <Label>จังหวัด <span className="text-red-500">*</span></Label>
              <ProvinceCombobox
                provinces={provinces}
                value={state.province_id}
                onChange={(v) => update({ province_id: v })}
              />
              {errors.province_id && <p className="text-xs text-red-500">{errors.province_id}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="district">อำเภอ/เขต</Label>
              <Input
                id="district"
                value={state.district}
                onChange={(e) => update({ district: e.target.value })}
                placeholder="เช่น บางรัก"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">ที่อยู่</Label>
              <Textarea
                id="address"
                value={state.address}
                onChange={(e) => update({ address: e.target.value })}
                placeholder="ระบุที่อยู่เพิ่มเติม (ไม่บังคับ)"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>พิกัด Google Maps (ไม่บังคับ)</Label>
              <GoogleMapsInput
                initialCoords={state.latitude && state.longitude
                  ? ({ lat: parseFloat(state.latitude), lng: parseFloat(state.longitude) } as Coords)
                  : null}
                onChange={(coords) =>
                  update({
                    latitude: coords ? String(coords.lat) : "",
                    longitude: coords ? String(coords.lng) : "",
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: รูปภาพ + สรุป ────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Label>รูปภาพ <span className="text-red-500">*</span> (อย่างน้อย 1 รูป)</Label>
              <ImageUploader
                userId={userId}
                listingId={state.listingId}
                onImagesChange={(paths) => update({ image_paths: paths })}
              />
              {errors.image_paths && <p className="text-xs text-red-500">{errors.image_paths}</p>}
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4 space-y-2 text-sm">
              <p className="font-semibold text-orange-800 mb-2">สรุปรายการ</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-700">
                <span className="text-neutral-500">ชื่อสินค้า</span>
                <span className="font-medium">{state.title}</span>
                <span className="text-neutral-500">ราคา</span>
                <span className="font-medium">
                  {state.price ? `฿${Number(state.price).toLocaleString("th-TH")}` : "-"}
                </span>
                <span className="text-neutral-500">สภาพ</span>
                <span className="font-medium">
                  {CONDITION_OPTIONS.find((c) => c.value === state.condition)?.label ?? "-"}
                </span>
                <span className="text-neutral-500">รูปภาพ</span>
                <span className="font-medium">{state.image_paths.length} รูป</span>
              </div>
              {state.description && (
                <div className="pt-2 border-t border-orange-200">
                  <p className="text-neutral-500 mb-1">รายละเอียด</p>
                  <RichTextDisplay html={state.description} />
                </div>
              )}
            </CardContent>
          </Card>

          {serverError && (
            <p className="text-sm text-red-500 text-center">{serverError}</p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              บันทึกแบบร่าง
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              เผยแพร่ประกาศ
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      {step < 3 && (
        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={goPrev} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> ย้อนกลับ
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={goNext} className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
            ถัดไป <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      {step === 3 && (
        <div className="mt-6">
          <Button variant="outline" onClick={goPrev} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> ย้อนกลับ
          </Button>
        </div>
      )}
    </div>
  );
}
