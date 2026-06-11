ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id varchar(80);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_access_token_enc text;
