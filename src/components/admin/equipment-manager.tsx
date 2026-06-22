import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateEquipmentStatusAction } from "@/lib/actions/equipment";
import { Eye } from "lucide-react";

type EquipmentRow = {
  id: string;
  title: string;
  slug: string;
  sale_price: number | null;
  condition: string | null;
  status: string;
  view_count: number;
  published_at: string | null;
  created_at: string;
  contact_name: string;
  contact_mobile: string;
  provinces: { name_th: string } | null;
  profiles: { display_name: string | null; mobile: string | null } | null;
};

const STATUS_LABEL: Record<string, { label: string; class: string }> = {
  published: { label: "เผยแพร่", class: "bg-green-100 text-green-700" },
  draft: { label: "แบบร่าง", class: "bg-neutral-100 text-neutral-600" },
  hidden: { label: "ซ่อน", class: "bg-yellow-100 text-yellow-700" },
  sold: { label: "ขายแล้ว", class: "bg-blue-100 text-blue-700" },
  reserved: { label: "จอง", class: "bg-purple-100 text-purple-700" },
  expired: { label: "หมดอายุ", class: "bg-red-100 text-red-700" },
};

async function EquipmentStatusForm({ listingId, currentStatus }: { listingId: string; currentStatus: string }) {
  const options: Array<{ value: string; label: string }> = [
    { value: "published", label: "เผยแพร่" },
    { value: "hidden", label: "ซ่อน" },
    { value: "sold", label: "ขายแล้ว" },
    { value: "draft", label: "แบบร่าง" },
  ];

  return (
    <form className="flex gap-1 flex-wrap">
      <input type="hidden" name="listing_id" value={listingId} />
      {options
        .filter((o) => o.value !== currentStatus)
        .map((o) => (
          <button
            key={o.value}
            formAction={async () => {
              "use server";
              await updateEquipmentStatusAction(listingId, o.value as "published" | "reserved" | "sold" | "hidden" | "draft");
            }}
            className="rounded-md border px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            {o.label}
          </button>
        ))}
    </form>
  );
}

export async function EquipmentManager() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from("listings")
    .select(
      "id, title, slug, sale_price, condition, status, view_count, published_at, created_at, contact_name, contact_mobile, provinces(name_th), profiles!listings_user_id_fkey(display_name, mobile)"
    )
    .eq("listing_type", "equipment")
    .order("created_at", { ascending: false })
    .limit(200);
  const listings: EquipmentRow[] = rows ?? [];


  const counts = {
    total: listings.length,
    published: listings.filter((l) => l.status === "published").length,
    sold: listings.filter((l) => l.status === "sold").length,
    hidden: listings.filter((l) => l.status === "hidden" || l.status === "draft").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="text-neutral-600">ทั้งหมด <strong>{counts.total}</strong></span>
        <span className="text-green-600">เผยแพร่ <strong>{counts.published}</strong></span>
        <span className="text-blue-600">ขายแล้ว <strong>{counts.sold}</strong></span>
        <span className="text-neutral-500">ซ่อน/ร่าง <strong>{counts.hidden}</strong></span>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-sm text-neutral-400">
          ยังไม่มีประกาศขายอุปกรณ์
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">สินค้า</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">ราคา</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">สภาพ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">สถานะ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">จังหวัด</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">ผู้ขาย</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">วิว</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">วันที่</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">เปลี่ยนสถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listings.map((l) => {
                  const statusInfo = STATUS_LABEL[l.status] ?? { label: l.status, class: "bg-neutral-100 text-neutral-600" };
                  return (
                    <tr key={l.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 max-w-[200px]">
                        <Link
                          href={`/equipment/${l.slug}`}
                          target="_blank"
                          className="font-medium text-neutral-800 hover:text-orange-600 line-clamp-2 text-xs leading-snug"
                        >
                          {l.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-700">
                        {l.sale_price != null
                          ? `฿${l.sale_price.toLocaleString("th-TH")}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-600">
                        {l.condition === "new" ? "มือ 1" : l.condition === "used" ? "มือ 2" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.class}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-600">
                        {l.provinces?.name_th ?? "—"}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="text-xs text-neutral-800 font-medium">
                          {(l.profiles?.display_name ?? l.contact_name) || "—"}
                        </div>
                        <div className="text-xs text-neutral-400">{l.profiles?.mobile ?? l.contact_mobile}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {l.view_count.toLocaleString("th-TH")}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                        {l.published_at
                          ? new Date(l.published_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
                          : new Date(l.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <EquipmentStatusForm listingId={l.id} currentStatus={l.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
