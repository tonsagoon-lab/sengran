-- Editable text fields for the "ประกาศเผยแพร่แล้ว" success modal shown after publishing a listing
ALTER TABLE system_announcement
  ADD COLUMN IF NOT EXISTS modal_title text NOT NULL DEFAULT 'ประกาศเผยแพร่แล้ว!',
  ADD COLUMN IF NOT EXISTS modal_subtitle text NOT NULL DEFAULT 'เลือกขั้นตอนถัดไป',
  ADD COLUMN IF NOT EXISTS button_text_package text NOT NULL DEFAULT 'ซื้อ package เซ้งร้าน',
  ADD COLUMN IF NOT EXISTS button_text_faak text NOT NULL DEFAULT 'ฝากเซ้งร้าน',
  ADD COLUMN IF NOT EXISTS button_text_view text NOT NULL DEFAULT 'ดูประกาศที่ลง';
