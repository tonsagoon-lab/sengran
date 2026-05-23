// data.jsx — sample data for Sengran mobile mocks
// Mirrors actual content patterns from the production codebase.

const CATS = [
  { id: 1, slug: "restaurant", name: "ร้านอาหาร",   icon: "utensils" },
  { id: 2, slug: "coffee",     name: "ร้านกาแฟ",     icon: "coffee" },
  { id: 3, slug: "salon",      name: "ร้านเสริมสวย",  icon: "scissors" },
  { id: 4, slug: "spa",        name: "สปา/นวด",     icon: "sparkles" },
  { id: 5, slug: "mart",       name: "มินิมาร์ท",    icon: "basket" },
  { id: 6, slug: "laundry",    name: "ร้านซักรีด",    icon: "washing" },
  { id: 7, slug: "carcare",    name: "คาร์แคร์",     icon: "car" },
  { id: 8, slug: "streetfood", name: "สตรีทฟู้ด",    icon: "store" },
];

const TYPE_BADGES = {
  sale: { label: "เซ้ง",      bg: "#dbeafe", fg: "#1d4ed8", bd: "#bfdbfe" },
  rent: { label: "ให้เช่า",    bg: "#dcfce7", fg: "#15803d", bd: "#bbf7d0" },
  both: { label: "เซ้ง+เช่า",  bg: "#f3e8ff", fg: "#7e22ce", bd: "#e9d5ff" },
};

const LISTINGS = [
  { id:"l1", title:"เซ้งร้านกาแฟ ย่านสีลม ทำเลดี ลูกค้าประจำเยอะ",
    type:"sale", sale_price:850000, rent_price:18000, deposit:2,
    province:"กรุงเทพมหานคร", district:"เขตบางรัก", area_label:"สีลม",
    category:"ร้านกาแฟ", img:"ph-coffee", featured:true, posted:"27 พ.ย.",
    views:1820, distance:1.2,
    seller:{ name:"คุณเอก", line:"@sengran-ek", mobile:"081-234-5678" } },
  { id:"l2", title:"ห้องเช่าสตรีทฟู้ด ใกล้ BTS อโศก คนเดินผ่านเยอะ",
    type:"rent", rent_price:8000, deposit:2,
    province:"กรุงเทพมหานคร", district:"เขตวัฒนา", area_label:"อโศก",
    category:"สตรีทฟู้ด", img:"ph-street", posted:"29 พ.ย.",
    views:412, distance:2.8,
    seller:{ name:"คุณพร", line:"@rent-pn", mobile:"089-345-6789" } },
  { id:"l3", title:"เซ้งและให้เช่าร้านอาหาร นิมมาน เชียงใหม่",
    type:"both", sale_price:1200000, rent_price:25000, deposit:3,
    province:"เชียงใหม่", district:"อ.เมือง", area_label:"นิมมาน",
    category:"ร้านอาหาร", img:"ph-restaurant", posted:"30 พ.ย.",
    views:624, distance:712,
    seller:{ name:"คุณนุ้ย", line:"@cm-nui", mobile:"087-456-7890" } },
  { id:"l4", title:"เซ้งร้านเสริมสวย พัทยากลาง พร้อมลูกค้าประจำ",
    type:"sale", sale_price:380000, rent_price:12000, deposit:2,
    province:"ชลบุรี", district:"บางละมุง", area_label:"พัทยา",
    category:"ร้านเสริมสวย", img:"ph-salon", posted:"1 ธ.ค.",
    views:290, distance:142,
    seller:{ name:"คุณแอน", line:"@salon-ann", mobile:"061-567-8901" } },
  { id:"l5", title:"ให้เช่าพื้นที่ มินิมาร์ท ภูเก็ต ใกล้แหล่งท่องเที่ยว",
    type:"rent", rent_price:35000, deposit:3,
    province:"ภูเก็ต", district:"กะทู้", area_label:"ป่าตอง",
    category:"มินิมาร์ท", img:"ph-mart", posted:"2 ธ.ค.",
    views:178, distance:680,
    seller:{ name:"คุณวิ", line:"@phuket-vi", mobile:"095-678-9012" } },
  { id:"l6", title:"เซ้งสปา ทองหล่อ ลูกค้าเก่าแน่น 60% ระยะยาว",
    type:"sale", sale_price:1800000, rent_price:45000, deposit:3,
    province:"กรุงเทพมหานคร", district:"เขตวัฒนา", area_label:"ทองหล่อ",
    category:"สปา/นวด", img:"ph-spa", featured:true, posted:"3 ธ.ค.",
    views:905, distance:3.4,
    seller:{ name:"คุณป๊อป", line:"@spa-pop", mobile:"089-789-0123" } },
];

const fmtTH = (n) => new Intl.NumberFormat("th-TH").format(n);

// Format price compactly for map pins: 850K, 1.2M, etc.
const fmtCompact = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000)     return Math.round(n / 1_000) + "K";
  return String(n);
};

window.SengranData = { CATS, LISTINGS, TYPE_BADGES, fmtTH, fmtCompact };
