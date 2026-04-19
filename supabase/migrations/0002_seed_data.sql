-- ============================================================
-- 0002_seed_data.sql
-- เซ้งร้าน.com — Seed data: provinces, categories, amenities
-- Run this SECOND in Supabase SQL Editor
-- ============================================================

-- ── Categories ───────────────────────────────────────────────
INSERT INTO categories (name_th, slug, icon, display_order, is_active) VALUES
  ('ร้านอาหาร',                    'restaurant',       'UtensilsCrossed', 1,  true),
  ('คาเฟ่/กาแฟ',                   'cafe',             'Coffee',          2,  true),
  ('ร้านเสริมสวย/ตัดผม',           'salon',            'Scissors',        3,  true),
  ('คลินิกความงาม/นวด/สปา',        'beauty-clinic',    'Sparkles',        4,  true),
  ('ร้านขายของชำ/มินิมาร์ท',       'minimart',         'ShoppingBasket',  5,  true),
  ('ร้านซักอบรีด/สะดวกซัก',        'laundry',          'WashingMachine',  6,  true),
  ('ร้านล้างรถ/ซ่อมรถ',            'car-service',      'Car',             7,  true),
  ('ตลาดนัด',                      'flea-market',      'Store',           8,  true),
  ('ร้านเหล้า/ผับ/คาราโอเกะ',      'bar-pub',          'Music',           9,  true),
  ('อื่นๆ',                        'other',            'LayoutGrid',      10, true);

-- ── Amenities ────────────────────────────────────────────────
INSERT INTO amenities (name_th, slug, icon) VALUES
  ('แอร์',           'air-conditioning', 'Wind'),
  ('ที่จอดรถ',       'parking',          'ParkingCircle'),
  ('พร้อมระบบ POS',  'pos-system',       'Monitor'),
  ('ห้องน้ำ',        'restroom',         'Bath'),
  ('ตู้เย็น',        'refrigerator',     'Refrigerator'),
  ('ติดถนน',         'roadside',         'MapPin'),
  ('เครื่องเสียง',   'sound-system',     'Volume2'),
  ('ทีวี',           'tv',               'Tv'),
  ('Wi-Fi',          'wifi',             'Wifi'),
  ('พร้อมพนักงาน',   'with-staff',       'Users'),
  ('สอนสูตร',        'recipe-included',  'BookOpen'),
  ('พักอาศัยได้',    'live-in',          'Home');

-- ── Provinces (all 77) ───────────────────────────────────────
INSERT INTO provinces (name_th, name_en, slug, region) VALUES
  -- Bangkok
  ('กรุงเทพมหานคร',   'Bangkok',           'bangkok',          'bangkok'),

  -- Central
  ('กำแพงเพชร',       'Kamphaeng Phet',    'kamphaeng-phet',   'central'),
  ('ชัยนาท',          'Chai Nat',          'chai-nat',         'central'),
  ('พระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya', 'ayutthaya', 'central'),
  ('ลพบุรี',          'Lop Buri',          'lop-buri',         'central'),
  ('นครนายก',         'Nakhon Nayok',      'nakhon-nayok',     'central'),
  ('นครปฐม',          'Nakhon Pathom',     'nakhon-pathom',    'central'),
  ('นครสวรรค์',       'Nakhon Sawan',      'nakhon-sawan',     'central'),
  ('นนทบุรี',         'Nonthaburi',        'nonthaburi',       'central'),
  ('ปทุมธานี',        'Pathum Thani',      'pathum-thani',     'central'),
  ('สมุทรปราการ',     'Samut Prakan',      'samut-prakan',     'central'),
  ('สมุทรสาคร',       'Samut Sakhon',      'samut-sakhon',     'central'),
  ('สมุทรสงคราม',     'Samut Songkhram',   'samut-songkhram',  'central'),
  ('สระบุรี',         'Saraburi',          'saraburi',         'central'),
  ('สิงห์บุรี',       'Sing Buri',         'sing-buri',        'central'),
  ('สุพรรณบุรี',      'Suphan Buri',       'suphan-buri',      'central'),
  ('อ่างทอง',         'Ang Thong',         'ang-thong',        'central'),
  ('อุทัยธานี',       'Uthai Thani',       'uthai-thani',      'central'),

  -- North
  ('เชียงใหม่',       'Chiang Mai',        'chiang-mai',       'north'),
  ('เชียงราย',        'Chiang Rai',        'chiang-rai',       'north'),
  ('แม่ฮ่องสอน',      'Mae Hong Son',      'mae-hong-son',     'north'),
  ('น่าน',            'Nan',               'nan',              'north'),
  ('พะเยา',           'Phayao',            'phayao',           'north'),
  ('แพร่',            'Phrae',             'phrae',            'north'),
  ('ลำปาง',           'Lampang',           'lampang',          'north'),
  ('ลำพูน',           'Lamphun',           'lamphun',          'north'),
  ('พิจิตร',          'Phichit',           'phichit',          'north'),
  ('พิษณุโลก',        'Phitsanulok',       'phitsanulok',      'north'),
  ('เพชรบูรณ์',       'Phetchabun',        'phetchabun',       'north'),
  ('สุโขทัย',         'Sukhothai',         'sukhothai',        'north'),
  ('ตาก',             'Tak',               'tak',              'north'),
  ('อุตรดิตถ์',       'Uttaradit',         'uttaradit',        'north'),

  -- Northeast (Isan)
  ('อำนาจเจริญ',      'Amnat Charoen',     'amnat-charoen',    'northeast'),
  ('บึงกาฬ',          'Bueng Kan',         'bueng-kan',        'northeast'),
  ('บุรีรัมย์',       'Buri Ram',          'buri-ram',         'northeast'),
  ('ชัยภูมิ',         'Chaiyaphum',        'chaiyaphum',       'northeast'),
  ('กาฬสินธุ์',       'Kalasin',           'kalasin',          'northeast'),
  ('ขอนแก่น',         'Khon Kaen',         'khon-kaen',        'northeast'),
  ('เลย',             'Loei',              'loei',             'northeast'),
  ('มหาสารคาม',       'Maha Sarakham',     'maha-sarakham',    'northeast'),
  ('มุกดาหาร',        'Mukdahan',          'mukdahan',         'northeast'),
  ('นครพนม',          'Nakhon Phanom',     'nakhon-phanom',    'northeast'),
  ('นครราชสีมา',      'Nakhon Ratchasima', 'nakhon-ratchasima','northeast'),
  ('หนองบัวลำภู',     'Nong Bua Lam Phu',  'nong-bua-lam-phu', 'northeast'),
  ('หนองคาย',         'Nong Khai',         'nong-khai',        'northeast'),
  ('ร้อยเอ็ด',        'Roi Et',            'roi-et',           'northeast'),
  ('สกลนคร',          'Sakon Nakhon',      'sakon-nakhon',     'northeast'),
  ('ศรีสะเกษ',        'Si Sa Ket',         'si-sa-ket',        'northeast'),
  ('สุรินทร์',        'Surin',             'surin',            'northeast'),
  ('อุดรธานี',        'Udon Thani',        'udon-thani',       'northeast'),
  ('อุบลราชธานี',     'Ubon Ratchathani',  'ubon-ratchathani', 'northeast'),
  ('ยโสธร',           'Yasothon',          'yasothon',         'northeast'),

  -- East
  ('ฉะเชิงเทรา',      'Chachoengsao',      'chachoengsao',     'east'),
  ('ชลบุรี',          'Chon Buri',         'chon-buri',        'east'),
  ('จันทบุรี',        'Chanthaburi',       'chanthaburi',      'east'),
  ('ปราจีนบุรี',      'Prachin Buri',      'prachin-buri',     'east'),
  ('ระยอง',           'Rayong',            'rayong',           'east'),
  ('สระแก้ว',         'Sa Kaeo',           'sa-kaeo',          'east'),
  ('ตราด',            'Trat',              'trat',             'east'),

  -- West
  ('กาญจนบุรี',       'Kanchanaburi',      'kanchanaburi',     'west'),
  ('เพชรบุรี',        'Phetchaburi',       'phetchaburi',      'west'),
  ('ประจวบคีรีขันธ์', 'Prachuap Khiri Khan','prachuap-khiri-khan','west'),
  ('ราชบุรี',         'Ratchaburi',        'ratchaburi',       'west'),

  -- South
  ('ชุมพร',           'Chumphon',          'chumphon',         'south'),
  ('กระบี่',          'Krabi',             'krabi',            'south'),
  ('นครศรีธรรมราช',   'Nakhon Si Thammarat','nakhon-si-thammarat','south'),
  ('นราธิวาส',        'Narathiwat',        'narathiwat',       'south'),
  ('ปัตตานี',         'Pattani',           'pattani',          'south'),
  ('พัทลุง',          'Phatthalung',       'phatthalung',      'south'),
  ('พังงา',           'Phang Nga',         'phang-nga',        'south'),
  ('ภูเก็ต',          'Phuket',            'phuket',           'south'),
  ('ระนอง',           'Ranong',            'ranong',           'south'),
  ('สตูล',            'Satun',             'satun',            'south'),
  ('สงขลา',           'Songkhla',          'songkhla',         'south'),
  ('สุราษฎร์ธานี',    'Surat Thani',       'surat-thani',      'south'),
  ('ตรัง',            'Trang',             'trang',            'south'),
  ('ยะลา',            'Yala',              'yala',             'south');
