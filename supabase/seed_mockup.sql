-- ============================================================
-- MOCK DATA — local dev / mockup only
-- Run AFTER migrations 0001–0014
-- ============================================================
-- NOTE: Replace <YOUR_USER_ID> with your actual auth.users UUID
--   from Supabase → Authentication → Users
-- ============================================================

DO $$
DECLARE
  v_user_id   uuid := '<YOUR_USER_ID>';  -- ← เปลี่ยนตรงนี้
  v_name      text;
  v_mobile    text;
  v_cat_food  int;
  v_cat_cafe  int;
  v_cat_salon int;
  v_cat_shop  int;
  v_prov_bkk  int;
  v_prov_cm   int;
  v_prov_pkt  int;
  v_prov_kk   int;
BEGIN

  -- ดึง contact info จาก profile
  SELECT display_name, mobile INTO v_name, v_mobile
  FROM profiles WHERE id = v_user_id;

  -- fallback ถ้า profile ยังไม่มีข้อมูล
  v_name   := COALESCE(v_name,   'ทดสอบ');
  v_mobile := COALESCE(v_mobile, '0800000000');

  -- ดึง category id
  SELECT id INTO v_cat_food  FROM categories WHERE slug = 'restaurant' LIMIT 1;
  SELECT id INTO v_cat_cafe  FROM categories WHERE slug = 'cafe'       LIMIT 1;
  SELECT id INTO v_cat_salon FROM categories WHERE slug = 'salon'      LIMIT 1;
  SELECT id INTO v_cat_shop  FROM categories WHERE slug = 'retail'     LIMIT 1;

  -- ดึง province id
  SELECT id INTO v_prov_bkk FROM provinces WHERE name_th = 'กรุงเทพมหานคร' LIMIT 1;
  SELECT id INTO v_prov_cm  FROM provinces WHERE name_th = 'เชียงใหม่'      LIMIT 1;
  SELECT id INTO v_prov_pkt FROM provinces WHERE name_th = 'ภูเก็ต'          LIMIT 1;
  SELECT id INTO v_prov_kk  FROM provinces WHERE name_th = 'ขอนแก่น'        LIMIT 1;

  -- ---- ร้านอาหาร กรุงเทพ ----
  INSERT INTO listings (id, user_id, title, slug, description, category_id, province_id,
    district, listing_type, sale_price, rent_price, contact_name, contact_mobile,
    status, view_count, latitude, longitude)
  VALUES
  (
    gen_random_uuid(), v_user_id,
    'เซ้งร้านก๋วยเตี๋ยวเรือ ย่านรัชดา ทำเลดีมาก',
    'kawtiao-rua-ratchada-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านก๋วยเตี๋ยวเรือขนาด 80 ตร.ม. ย่านรัชดาภิเษก เปิดมา 5 ปี มีลูกค้าประจำ อุปกรณ์ครบ สัญญาเช่าเหลือ 2 ปี ไม่รวมค่าเช่า</p>',
    v_cat_food, v_prov_bkk, 'ห้วยขวาง', 'sale', 350000, NULL, v_name, v_mobile,
    'published', 128, 13.7760, 100.5700
  ),
  (
    gen_random_uuid(), v_user_id,
    'เซ้งร้านสเต็ก ซอยลาดพร้าว 71 ขายพร้อมอุปกรณ์ทั้งหมด',
    'steak-ladprao-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านสเต็กตกแต่งสวย ขนาด 60 ตร.ม. มีที่จอดรถ 4 คัน ยอดขายเฉลี่ย 50,000/เดือน เจ้าของย้ายต่างประเทศจึงขอเซ้ง</p>',
    v_cat_food, v_prov_bkk, 'ลาดพร้าว', 'sale', 480000, NULL, v_name, v_mobile,
    'published', 94, 13.8050, 100.6100
  ),
  (
    gen_random_uuid(), v_user_id,
    'ให้เช่าพื้นที่เปิดร้านอาหาร ใจกลางสีลม ชั้น G',
    'food-space-silom-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>พื้นที่พาณิชย์ชั้นล่าง 120 ตร.ม. ใกล้ BTS สีลม เหมาะทำร้านอาหาร ออฟฟิศแวะทาน ค่าเช่า 35,000/เดือน</p>',
    v_cat_food, v_prov_bkk, 'บางรัก', 'rent', NULL, 35000, v_name, v_mobile,
    'published', 211, 13.7226, 100.5249
  ),

  -- ---- คาเฟ่ กรุงเทพ ----
  (
    gen_random_uuid(), v_user_id,
    'เซ้งคาเฟ่บรรยากาศดี ย่านอารีย์ มีลูกค้าประจำ',
    'cafe-ari-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>คาเฟ่สไตล์มินิมอล ขนาด 50 ตร.ม. ย่านอารีย์ เปิดมา 3 ปี รีวิวดีใน Google 4.7★ เครื่องชงกาแฟ La Marzocco รวมในราคา</p>',
    v_cat_cafe, v_prov_bkk, 'พญาไท', 'sale', 550000, NULL, v_name, v_mobile,
    'published', 347, 13.7750, 100.5497
  ),
  (
    gen_random_uuid(), v_user_id,
    'เซ้งและให้เช่าร้านกาแฟ อ่อนนุช ใกล้ BTS',
    'cafe-onnut-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านกาแฟขนาด 45 ตร.ม. ใกล้ BTS อ่อนนุช เดิน 3 นาที เหมาะสายคาเฟ่หน้าใหม่ มีเมนูและสูตรให้ด้วย</p>',
    v_cat_cafe, v_prov_bkk, 'สวนหลวง', 'both', 280000, 18000, v_name, v_mobile,
    'published', 183, 13.7000, 100.6010
  ),

  -- ---- คาเฟ่ เชียงใหม่ ----
  (
    gen_random_uuid(), v_user_id,
    'เซ้งคาเฟ่วิวดอย นิมมานเหมินท์ เชียงใหม่',
    'cafe-nimman-chiangmai-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>คาเฟ่สองชั้น ขนาด 80 ตร.ม. ย่านนิมมานเหมินท์ วิวสวย เปิดมา 4 ปี ยอดขาย 80,000–100,000/เดือน</p>',
    v_cat_cafe, v_prov_cm, 'สุเทพ', 'sale', 750000, NULL, v_name, v_mobile,
    'published', 520, 18.7980, 98.9600
  ),
  (
    gen_random_uuid(), v_user_id,
    'ให้เช่าคาเฟ่ตกแต่งล้านนา ใจกลางเมืองเชียงใหม่',
    'cafe-lanna-chiangmai-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>พื้นที่ 90 ตร.ม. ตกแต่งสไตล์ล้านนาพร้อมอยู่ ใกล้ประตูท่าแพ เหมาะทำคาเฟ่หรือของฝาก ค่าเช่า 22,000/เดือน</p>',
    v_cat_cafe, v_prov_cm, 'เมืองเชียงใหม่', 'rent', NULL, 22000, v_name, v_mobile,
    'published', 290, 18.7883, 98.9870
  ),

  -- ---- ร้านภูเก็ต ----
  (
    gen_random_uuid(), v_user_id,
    'เซ้งร้านอาหารทะเล ป่าตอง ภูเก็ต ทำเลนักท่องเที่ยว',
    'seafood-patong-phuket-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านอาหารทะเล 150 ตร.ม. ย่านป่าตอง ภูเก็ต ใกล้ถนนบางลา นักท่องเที่ยวเยอะตลอดปี รายได้ดีมากช่วง High Season</p>',
    v_cat_food, v_prov_pkt, 'กะทู้', 'both', 900000, 45000, v_name, v_mobile,
    'published', 612, 7.8908, 98.2966
  ),
  (
    gen_random_uuid(), v_user_id,
    'เซ้งร้านสปา นวดแผนไทย ป่าตอง ภูเก็ต กิจการดี',
    'spa-patong-phuket-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านสปา/นวดแผนไทย 6 ห้อง ย่านป่าตอง เปิดมา 6 ปี มีพนักงานประจำ 8 คน ลูกค้าต่างชาติ 70%</p>',
    v_cat_salon, v_prov_pkt, 'กะทู้', 'sale', 1200000, NULL, v_name, v_mobile,
    'published', 445, 7.8920, 98.2940
  ),

  -- ---- ร้านขอนแก่น ----
  (
    gen_random_uuid(), v_user_id,
    'เซ้งร้านส้มตำ ใกล้มหาวิทยาลัยขอนแก่น',
    'somtam-kku-khonkaen-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านส้มตำ-อาหารอีสาน ขนาด 40 ตร.ม. เปิดมา 2 ปี ใกล้ มข. ขายดีมากช่วงเปิดเทอม รายได้ 30,000–50,000/เดือน</p>',
    v_cat_food, v_prov_kk, 'เมืองขอนแก่น', 'sale', 120000, NULL, v_name, v_mobile,
    'published', 88, 16.4730, 102.8230
  ),
  (
    gen_random_uuid(), v_user_id,
    'ให้เช่าพื้นที่ขายของ ตลาดขอนแก่น ราคาถูก',
    'shop-talad-khonkaen-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>พื้นที่แผงขายของในตลาด 20 ตร.ม. เหมาะทำร้านเสื้อผ้า อาหารแห้ง ของฝาก ค่าเช่าถูก 4,500/เดือน</p>',
    v_cat_shop, v_prov_kk, 'เมืองขอนแก่น', 'rent', NULL, 4500, v_name, v_mobile,
    'published', 55, 16.4320, 102.8350
  ),

  -- ---- ร้านเสริมสวย/ร้านค้า กรุงเทพ ----
  (
    gen_random_uuid(), v_user_id,
    'เซ้งร้านเสริมสวย ทำผม สุขุมวิท 101 ลูกค้าประจำเยอะ',
    'salon-sukhumvit-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านทำผม 35 ตร.ม. ย่านสุขุมวิท 101 เปิดมา 7 ปี ลูกค้าประจำ 200+ คน อุปกรณ์ครบ เก้าอี้ 4 ตัว</p>',
    v_cat_salon, v_prov_bkk, 'พระโขนง', 'sale', 200000, NULL, v_name, v_mobile,
    'published', 167, 13.6965, 100.6050
  ),
  (
    gen_random_uuid(), v_user_id,
    'เซ้งร้านค้าปลีก ย่านมีนบุรี ขนาด 2 คูหา',
    'retail-minburi-' || substr(gen_random_uuid()::text, 1, 8),
    '<p>ร้านค้าปลีก 2 คูหาติดกัน รวม 80 ตร.ม. ย่านมีนบุรี ชุมชนหนาแน่น มีที่จอดรถ เจ้าของปิดกิจการย้ายบ้าน</p>',
    v_cat_shop, v_prov_bkk, 'มีนบุรี', 'sale', 300000, NULL, v_name, v_mobile,
    'published', 74, 13.8070, 100.7480
  );

END $$;
