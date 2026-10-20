-- Catálogo inicial transcrito da planilha Calçado Próprio - Final.
-- Preço e rendimento permanecem separados; o custo é sempre calculado pelo sistema.
INSERT INTO "sales_channels" ("name", "fixed_fee", "percentage_fee", "active")
VALUES ('Venda direta', 0, 0, true)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_settings" ("id", "target_profit", "default_channel_id")
SELECT 1, 5, id FROM "sales_channels" WHERE "name" = 'Shopee'
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "materials" ("name","supplier","unit","purchase_price","purchase_quantity")
SELECT v.* FROM (VALUES
 ('TOBOX 4 mm','Callmart - Casin','PAR',26.00,65.00),
 ('Forro sintético para palmilha','Sincomm','PAR',15.00,40.00),
 ('Saquinho de embalagem','VICCAM','UN',47.50,250.00),
 ('Sola rasteira branca','Natiely calçados','PAR',4.00,1.00),
 ('Sola bege','Alves','PAR',4.40,1.00),
 ('Cedro B prata','Sincomm','PAR',16.50,1.00),
 ('Tira Nice Ouro Light','Fornecedor atual','MT',5.90,1.00),
 ('Tira Mônaco Bco Cristal','Fornecedor atual','MT',5.90,1.00),
 ('Tira Colmeia 4mm Bco Cristal','Fornecedor atual','MT',3.90,1.00),
 ('Tira Paris Camurça Bco/Cristal','Fornecedor atual','MT',3.50,1.00),
 ('Trança Spectro Dourado','Fornecedor atual','MT',2.00,1.00),
 ('Sola All Star','Noroeste','PAR',3.30,1.00),
 ('Forro Cacharrel','Noroeste','PAR',15.00,20.00),
 ('EVA palmilha forrado 4mm','Noroeste','PAR',20.00,60.00),
 ('Forro Nylon','Noroeste','PAR',20.00,20.00),
 ('Material Spectro Ouro','Noroeste','MT',26.90,1.00),
 ('Manta strass','Compofram','MT',16.00,1.00),
 ('Fivela','VL Bandeirantes','UN',19.00,100.00),
 ('Palmilha corte','Produção própria','PAR',1.00,1.00),
 ('Montagem','Produção própria','PAR',3.50,1.00),
 ('Carimbo palmilha','Produção própria','PAR',0.20,1.00),
 ('Pesponto palmilha','Produção própria','PAR',0.50,1.00),
 ('Corte cabedal','Produção própria','PAR',0.50,1.00),
 ('Waster','Produção própria','PAR',0.80,1.00),
 ('Pesponto tênis','Produção própria','PAR',1.50,1.00),
 ('Caixa','Fornecedor atual','UN',0.90,1.00),
 ('Enfeite emborrachado','Silvana/Quemil','PAR',2.00,1.00)
) AS v(name,supplier,unit,price,yield_quantity)
WHERE NOT EXISTS (SELECT 1 FROM "materials" m WHERE lower(m."name")=lower(v.name));
--> statement-breakpoint
INSERT INTO "products" ("name","sku","category","color","current_price") VALUES
 ('Ana','ANA-OURO','Sandália','Ouro',37.99),
 ('Luíza','LUIZA-CRISTAL','Sandália','Rosa / Preto / Branco',33.99),
 ('Pietra','PIETRA-COLMEIA','Sandália','Rosa / Preto / Branco',32.99),
 ('Patricia','PATRICIA-PARIS','Sandália','Rosa / Preto / Branco',32.99),
 ('Lara','LARA-DOURADO','Sandália','Ouro',29.99),
 ('Lívia Flor','CAB-LIVIA-FLOR','Sandália de cabedal',NULL,33.99),
 ('Lívia Laço','CAB-LIVIA-LACO','Sandália de cabedal',NULL,33.99),
 ('Lívia Borboleta','CAB-LIVIA-BORB','Sandália de cabedal',NULL,36.63),
 ('Lívia Strass','CAB-LIVIA-STRASS','Sandália de cabedal',NULL,34.63),
 ('Ágata','CAB-AGATA','Sandália de cabedal',NULL,34.65),
 ('Carol','CAB-CAROL','Sandália de cabedal',NULL,33.99),
 ('Tênis Cacharrel','TENIS-CACHARREL','Tênis',NULL,34.49),
 ('Tênis Nylon','TENIS-NYLON','Tênis',NULL,32.99)
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
-- Componentes cujo consumo aparece explicitamente nas abas da planilha.
INSERT INTO "product_components" ("product_id","material_id","quantity")
SELECT p.id,m.id,x.quantity FROM (VALUES
 ('ANA-OURO','Tira Nice Ouro Light',0.97),('LUIZA-CRISTAL','Tira Mônaco Bco Cristal',0.97),
 ('PIETRA-COLMEIA','Tira Colmeia 4mm Bco Cristal',1.07),('PATRICIA-PARIS','Tira Paris Camurça Bco/Cristal',0.99),
 ('LARA-DOURADO','Trança Spectro Dourado',1.00),
 ('TENIS-CACHARREL','Forro Cacharrel',2.00),('TENIS-CACHARREL','EVA palmilha forrado 4mm',1.00),
 ('TENIS-CACHARREL','Sola All Star',1.00),('TENIS-NYLON','Forro Nylon',1.00),
 ('TENIS-NYLON','Forro Cacharrel',1.00),('TENIS-NYLON','EVA palmilha forrado 4mm',1.00),
 ('TENIS-NYLON','Sola All Star',1.00)
) AS x(sku,material_name,quantity)
JOIN "products" p ON p.sku=x.sku JOIN "materials" m ON lower(m.name)=lower(x.material_name)
ON CONFLICT ("product_id","material_id") DO NOTHING;
