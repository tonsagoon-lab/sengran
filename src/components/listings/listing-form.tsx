"use client";

import { useEffect, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { listingSchema, type ListingFormValues } from "@/lib/schemas/listing";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvinceCombobox } from "./province-combobox";
import { ImageUploader } from "./image-uploader";
import type { ListingActionResult } from "@/lib/actions/listings";
import type { ListingWithImages } from "@/lib/db/listings";

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

interface ListingFormProps {
  userId: string;
  categories: Category[];
  provinces: Province[];
  action: (prevState: ListingActionResult, formData: FormData) => Promise<ListingActionResult>;
  listing?: ListingWithImages;
}

export function ListingForm({ userId, categories, provinces, action, listing }: ListingFormProps) {
  const router = useRouter();
  const listingId = listing?.id ?? crypto.randomUUID();

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      listing_type: listing?.listing_type ?? "rent",
      sale_price: listing?.sale_price != null ? String(listing.sale_price) : "",
      rent_price: listing?.rent_price != null ? String(listing.rent_price) : "",
      deposit_months: listing?.deposit_months != null ? String(listing.deposit_months) : "",
      price_note: listing?.price_note ?? "",
      category_id: listing?.category_id != null ? String(listing.category_id) : "",
      province_id: listing?.province_id != null ? String(listing.province_id) : "",
      district: listing?.district ?? "",
      address: listing?.address ?? "",
      area_sqm: listing?.area_sqm != null ? String(listing.area_sqm) : "",
      video_url: listing?.video_url ?? "",
      latitude: listing?.latitude != null ? String(listing.latitude) : "",
      longitude: listing?.longitude != null ? String(listing.longitude) : "",
    },
  });

  const listingType = form.watch("listing_type");

  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.push("/my-listings");
    }
  }, [state, router]);

  const existingImages =
    listing?.listing_images.map((img) => ({
      id: img.id,
      storage_path: img.storage_path,
      preview_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${img.storage_path}`,
      display_order: img.display_order,
    })) ?? [];

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="listing_id" value={listingId} />

        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="listing_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทการเซ้ง/เช่า *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6"
                      name="listing_type"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="sale" id="sale" />
                        <label htmlFor="sale" className="text-sm cursor-pointer">
                          เซ้งอย่างเดียว
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="rent" id="rent" />
                        <label htmlFor="rent" className="text-sm cursor-pointer">
                          เช่าอย่างเดียว
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="both" id="both" />
                        <label htmlFor="both" className="text-sm cursor-pointer">
                          เซ้งและให้เช่า
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อประกาศ *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      name="title"
                      placeholder="เช่น เซ้งร้านกาแฟ ย่านสีลม ทำเลดี"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายละเอียด *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      name="description"
                      placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับร้าน สัญญาเช่า อุปกรณ์ที่แถม ฯลฯ"
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ประเภทกิจการ</FormLabel>
                  <Select
                    name="category_id"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทกิจการ (ไม่บังคับ)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name_th}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Price */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ราคา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(listingType === "sale" || listingType === "both") && (
              <FormField
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาเซ้ง (บาท) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        name="sale_price"
                        type="number"
                        min="0"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {(listingType === "rent" || listingType === "both") && (
              <>
                <FormField
                  control={form.control}
                  name="rent_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ค่าเช่า/เดือน (บาท) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          name="rent_price"
                          type="number"
                          min="0"
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deposit_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>เงินมัดจำ (เดือน)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          name="deposit_months"
                          type="number"
                          min="0"
                          max="12"
                          placeholder="2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="price_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุราคา</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      name="price_note"
                      placeholder="เช่น ราคานี้รวมอุปกรณ์ทั้งหมด"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ที่ตั้ง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="province_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>จังหวัด *</FormLabel>
                  <input type="hidden" name="province_id" value={field.value} />
                  <ProvinceCombobox
                    provinces={provinces}
                    value={field.value}
                    onChange={field.onChange}
                    error={form.formState.errors.province_id?.message}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เขต/อำเภอ</FormLabel>
                  <FormControl>
                    <Input {...field} name="district" placeholder="เขตบางรัก" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ที่อยู่/รายละเอียดที่ตั้ง</FormLabel>
                  <FormControl>
                    <Input {...field} name="address" placeholder="ใกล้ BTS สีลม ชั้น G" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="area_sqm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>พื้นที่ใช้สอย (ตร.ม.)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      name="area_sqm"
                      type="number"
                      min="0"
                      placeholder="50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รูปภาพ</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUploader
              userId={userId}
              listingId={listingId}
              existingImages={existingImages}
            />
          </CardContent>
        </Card>

        {/* Video */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ลิงก์วิดีโอ</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ลิงก์วิดีโอ (YouTube / TikTok) ไม่บังคับ</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      name="video_url"
                      type="url"
                      placeholder="https://youtube.com/..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white min-w-32"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {listing ? "บันทึกการเปลี่ยนแปลง" : "ลงประกาศ"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
