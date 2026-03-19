-- Minimal configuration seed backup for D1
-- Use this file after creating tables if you need to restore baseline app configuration.

DELETE FROM asset_status_catalog;
DELETE FROM recognition_document_types;

INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('en_uso','En uso',1,1,10,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('disponible','Disponible',0,1,20,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('solicitado','Solicitado',0,1,30,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('pendiente_recepcion','Pendiente de aceptar recepcion',0,1,40,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('mantenimiento','Mantenimiento',0,1,50,'2026-03-17 18:13:38');
INSERT INTO asset_status_catalog (code, label, is_default, is_active, sort_order, created_at) VALUES('baja','Baja',0,1,60,'2026-03-17 18:13:38');

INSERT INTO recognition_document_types (code, label, is_active, sort_order, created_at) VALUES('trofeo','Trofeo',1,10,'2026-03-18 00:00:00');
INSERT INTO recognition_document_types (code, label, is_active, sort_order, created_at) VALUES('certificado','Certificado',1,20,'2026-03-18 00:00:00');
INSERT INTO recognition_document_types (code, label, is_active, sort_order, created_at) VALUES('grillete','Grillete',1,30,'2026-03-18 00:00:00');
INSERT INTO recognition_document_types (code, label, is_active, sort_order, created_at) VALUES('estandarte','Estandarte',1,40,'2026-03-18 00:00:00');
INSERT INTO recognition_document_types (code, label, is_active, sort_order, created_at) VALUES('placa','Placa',1,50,'2026-03-18 00:00:00');
INSERT INTO recognition_document_types (code, label, is_active, sort_order, created_at) VALUES('medalla','Medalla',1,60,'2026-03-18 00:00:00');
