-- Minimal configuration seed backup for D1
-- Use this file after creating tables if you need to restore baseline app configuration.

DELETE FROM asset_status_catalog;

INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('en_uso','En uso',1,1,10,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('disponible','Disponible',0,1,20,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('solicitado','Solicitado',0,1,30,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('pendiente_recepcion','Pendiente de aceptar recepcion',0,1,40,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('mantenimiento','Mantenimiento',0,1,50,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('baja','Baja',0,1,60,'2026-03-17 18:13:38');
