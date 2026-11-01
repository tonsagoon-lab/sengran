-- Add subdistrict (ตำบล/แขวง) column to listings so the wizard can store the
-- selected name_th alongside the existing free-text district column.
-- Province remains a FK (province_id); district + subdistrict stay as text
-- to avoid a hard join against a Thai admin dataset table.
alter table listings add column if not exists subdistrict text;
