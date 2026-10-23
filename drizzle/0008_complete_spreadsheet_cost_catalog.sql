ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "cost_type" varchar(20) DEFAULT 'material' NOT NULL;
--> statement-breakpoint
WITH catalog(name,supplier,cost_type,unit,price,yield_quantity) AS (VALUES
  ('TOBOX 4 mm','Callmart - Casin','material','PAR',26.00,65.00),
  ('Forro sintético para palmilha','Sincomm','material','PAR',15.00,40.00),
  ('Saquinho de embalagem','VICCAM','packaging','UN',47.50,250.00),
  ('Sola rasteira branca','Natiely calçados','material','PAR',4.00,1.00),
  ('Sola bege','Alves','material','PAR',4.40,1.00),
  ('Cedro B prata','Sincomm','material','MT',16.50,1.00),
  ('Forro comum','Sincomm','material','MT',12.64,1.00),
  ('Cedro prata','Sincomm','material','MT',14.81,1.00),
  ('Material para tira (Napa)','Sincomm','material','MT',12.64,1.00),
  ('Tiras Strass Paris','Compofram','material','MT',175.00,50.00),
  ('Tira Nice Ouro Light','Fornecedor atual','material','MT',5.90,1.00),
  ('Tira Mônaco Bco Cristal','Fornecedor atual','material','MT',5.90,1.00),
  ('Tira Colmeia 4mm Bco Cristal','Fornecedor atual','material','MT',3.90,1.00),
  ('Tira Paris Camurça Bco/Cristal','Fornecedor atual','material','MT',3.50,1.00),
  ('Trança Spectro Dourado','Fornecedor atual','material','MT',2.00,1.00),
  ('Elástico para tira','Fornecedor atual','material','PAR',1.358,1.00),
  ('Sola All Star','Noroeste','material','PAR',3.30,1.00),
  ('Forro Cacharrel','Noroeste','material','PAR',15.00,20.00),
  ('EVA palmilha forrado 4mm','Noroeste','material','PAR',20.00,60.00),
  ('Forro Nylon','Noroeste','material','PAR',20.00,20.00),
  ('Material Spectro Ouro','Noroeste','material','MT',26.90,1.00),
  ('Material Spectro Prata','Noroeste','material','MT',26.90,1.00),
  ('Glitter prata para enfeite','Noroeste','material','MT',23.90,1.00),
  ('Manta strass','Compofram','material','MT',16.00,1.00),
  ('Fivela','VL Bandeirantes','material','UN',19.00,1.00),
  ('Material pronto cabedal','Almeida''s','material','PAR',48.40,44.00),
  ('Tira fabricada VL Bandeirantes','Vila Bandeirante','material','PAR',0.99,1.00),
  ('Dublagem','Almeida''s','service','PAR',5.00,1.00),
  ('Mão de obra tira comum','AR TIRAS','labor','PAR',2.40,1.00),
  ('Mão de obra tira trança','AR TIRAS','labor','PAR',1.80,1.00),
  ('Palmilha corte','Produção própria','service','PAR',1.00,1.00),
  ('Montagem sandália','Produção própria','labor','PAR',3.50,1.00),
  ('Montagem tênis','Produção própria','labor','PAR',4.00,1.00),
  ('Carimbo palmilha','Produção própria','service','PAR',0.20,1.00),
  ('Pesponto palmilha','Produção própria','service','PAR',0.50,1.00),
  ('Corte cabedal sandália','Produção própria','service','PAR',0.60,1.00),
  ('Corte cabedal tênis','Produção própria','service','PAR',0.50,1.00),
  ('Pesponto cabedal','Produção própria','service','PAR',2.00,1.00),
  ('Waster','Produção própria','service','PAR',0.80,1.00),
  ('Pesponto tênis','Produção própria','service','PAR',1.50,1.00),
  ('Caixa','Fornecedor atual','packaging','UN',0.90,1.00),
  ('Enfeite emborrachado','Silvana/Quemil','material','PAR',2.00,1.00),
  ('Fivela por par','VL Bandeirantes','material','PAR',0.42,1.00),
  ('Enfeite Flor','Produção própria','service','PAR',1.52,1.00),
  ('Enfeite Laço','Produção própria','service','PAR',1.52,1.00),
  ('Enfeite Borboleta','Produção própria','service','PAR',1.52,1.00),
  ('Enfeite Strass','Produção própria','service','PAR',1.225,1.00),
  ('Enfeite Ágata','Produção própria','service','PAR',2.04,1.00),
  ('Enfeite Carol','Produção própria','service','PAR',1.59,1.00)
)
UPDATE "materials" m SET supplier=c.supplier,cost_type=c.cost_type,unit=c.unit,
  purchase_price=c.price,purchase_quantity=c.yield_quantity,active=true,updated_at=NOW()
FROM catalog c WHERE lower(m.name)=lower(c.name);
--> statement-breakpoint
WITH catalog(name,supplier,cost_type,unit,price,yield_quantity) AS (VALUES
  ('Forro comum','Sincomm','material','MT',12.64,1.00),('Cedro prata','Sincomm','material','MT',14.81,1.00),
  ('Material para tira (Napa)','Sincomm','material','MT',12.64,1.00),('Tiras Strass Paris','Compofram','material','MT',175.00,50.00),
  ('Elástico para tira','Fornecedor atual','material','PAR',1.358,1.00),('Material Spectro Prata','Noroeste','material','MT',26.90,1.00),
  ('Glitter prata para enfeite','Noroeste','material','MT',23.90,1.00),('Material pronto cabedal','Almeida''s','material','PAR',48.40,44.00),
  ('Tira fabricada VL Bandeirantes','Vila Bandeirante','material','PAR',0.99,1.00),('Dublagem','Almeida''s','service','PAR',5.00,1.00),
  ('Mão de obra tira comum','AR TIRAS','labor','PAR',2.40,1.00),('Mão de obra tira trança','AR TIRAS','labor','PAR',1.80,1.00),
  ('Montagem sandália','Produção própria','labor','PAR',3.50,1.00),('Montagem tênis','Produção própria','labor','PAR',4.00,1.00),
  ('Corte cabedal sandália','Produção própria','service','PAR',0.60,1.00),('Corte cabedal tênis','Produção própria','service','PAR',0.50,1.00),
  ('Pesponto cabedal','Produção própria','service','PAR',2.00,1.00),('Fivela por par','VL Bandeirantes','material','PAR',0.42,1.00),
  ('Enfeite Flor','Produção própria','service','PAR',1.52,1.00),('Enfeite Laço','Produção própria','service','PAR',1.52,1.00),
  ('Enfeite Borboleta','Produção própria','service','PAR',1.52,1.00),('Enfeite Strass','Produção própria','service','PAR',1.225,1.00),
  ('Enfeite Ágata','Produção própria','service','PAR',2.04,1.00),('Enfeite Carol','Produção própria','service','PAR',1.59,1.00)
)
INSERT INTO "materials" (name,supplier,cost_type,unit,purchase_price,purchase_quantity)
SELECT c.* FROM catalog c WHERE NOT EXISTS (SELECT 1 FROM materials m WHERE lower(m.name)=lower(c.name));
--> statement-breakpoint
UPDATE materials SET active=false,updated_at=NOW()
WHERE name IN ('Montagem','Corte cabedal');
--> statement-breakpoint
WITH components(sku,material_name,quantity) AS (VALUES
  ('ANA-OURO','TOBOX 4 mm',1),('ANA-OURO','Forro sintético para palmilha',1),('ANA-OURO','Saquinho de embalagem',1),('ANA-OURO','Sola rasteira branca',1),('ANA-OURO','Palmilha corte',1),('ANA-OURO','Montagem sandália',1),('ANA-OURO','Carimbo palmilha',1),('ANA-OURO','Pesponto palmilha',1),('ANA-OURO','Caixa',1),('ANA-OURO','Elástico para tira',1),
  ('LUIZA-CRISTAL','TOBOX 4 mm',1),('LUIZA-CRISTAL','Forro sintético para palmilha',1),('LUIZA-CRISTAL','Saquinho de embalagem',1),('LUIZA-CRISTAL','Sola rasteira branca',1),('LUIZA-CRISTAL','Palmilha corte',1),('LUIZA-CRISTAL','Montagem sandália',1),('LUIZA-CRISTAL','Carimbo palmilha',1),('LUIZA-CRISTAL','Pesponto palmilha',1),('LUIZA-CRISTAL','Caixa',1),('LUIZA-CRISTAL','Elástico para tira',1),
  ('PIETRA-COLMEIA','TOBOX 4 mm',1),('PIETRA-COLMEIA','Forro sintético para palmilha',1),('PIETRA-COLMEIA','Saquinho de embalagem',1),('PIETRA-COLMEIA','Sola rasteira branca',1),('PIETRA-COLMEIA','Palmilha corte',1),('PIETRA-COLMEIA','Montagem sandália',1),('PIETRA-COLMEIA','Carimbo palmilha',1),('PIETRA-COLMEIA','Pesponto palmilha',1),('PIETRA-COLMEIA','Caixa',1),('PIETRA-COLMEIA','Elástico para tira',1),
  ('PATRICIA-PARIS','TOBOX 4 mm',1),('PATRICIA-PARIS','Forro sintético para palmilha',1),('PATRICIA-PARIS','Saquinho de embalagem',1),('PATRICIA-PARIS','Sola rasteira branca',1),('PATRICIA-PARIS','Palmilha corte',1),('PATRICIA-PARIS','Montagem sandália',1),('PATRICIA-PARIS','Carimbo palmilha',1),('PATRICIA-PARIS','Pesponto palmilha',1),('PATRICIA-PARIS','Caixa',1),('PATRICIA-PARIS','Elástico para tira',1),
  ('LARA-DOURADO','TOBOX 4 mm',1),('LARA-DOURADO','Forro sintético para palmilha',1),('LARA-DOURADO','Saquinho de embalagem',1),('LARA-DOURADO','Sola rasteira branca',1),('LARA-DOURADO','Palmilha corte',1),('LARA-DOURADO','Montagem sandália',1),('LARA-DOURADO','Carimbo palmilha',1),('LARA-DOURADO','Pesponto palmilha',1),('LARA-DOURADO','Caixa',1),('LARA-DOURADO','Elástico para tira',1),
  ('CAB-LIVIA-FLOR','TOBOX 4 mm',1),('CAB-LIVIA-FLOR','Forro sintético para palmilha',1),('CAB-LIVIA-FLOR','Saquinho de embalagem',1),('CAB-LIVIA-FLOR','Sola rasteira branca',1),('CAB-LIVIA-FLOR','Palmilha corte',1),('CAB-LIVIA-FLOR','Montagem sandália',1),('CAB-LIVIA-FLOR','Carimbo palmilha',1),('CAB-LIVIA-FLOR','Pesponto palmilha',1),('CAB-LIVIA-FLOR','Caixa',1),('CAB-LIVIA-FLOR','Corte cabedal sandália',1),('CAB-LIVIA-FLOR','Pesponto cabedal',1),('CAB-LIVIA-FLOR','Material pronto cabedal',1),('CAB-LIVIA-FLOR','Fivela por par',1),('CAB-LIVIA-FLOR','Enfeite Flor',1),
  ('CAB-LIVIA-LACO','TOBOX 4 mm',1),('CAB-LIVIA-LACO','Forro sintético para palmilha',1),('CAB-LIVIA-LACO','Saquinho de embalagem',1),('CAB-LIVIA-LACO','Sola rasteira branca',1),('CAB-LIVIA-LACO','Palmilha corte',1),('CAB-LIVIA-LACO','Montagem sandália',1),('CAB-LIVIA-LACO','Carimbo palmilha',1),('CAB-LIVIA-LACO','Pesponto palmilha',1),('CAB-LIVIA-LACO','Caixa',1),('CAB-LIVIA-LACO','Corte cabedal sandália',1),('CAB-LIVIA-LACO','Pesponto cabedal',1),('CAB-LIVIA-LACO','Material pronto cabedal',1),('CAB-LIVIA-LACO','Fivela por par',1),('CAB-LIVIA-LACO','Enfeite Laço',1),
  ('CAB-LIVIA-BORB','TOBOX 4 mm',1),('CAB-LIVIA-BORB','Forro sintético para palmilha',1),('CAB-LIVIA-BORB','Saquinho de embalagem',1),('CAB-LIVIA-BORB','Sola rasteira branca',1),('CAB-LIVIA-BORB','Palmilha corte',1),('CAB-LIVIA-BORB','Montagem sandália',1),('CAB-LIVIA-BORB','Carimbo palmilha',1),('CAB-LIVIA-BORB','Pesponto palmilha',1),('CAB-LIVIA-BORB','Caixa',1),('CAB-LIVIA-BORB','Corte cabedal sandália',1),('CAB-LIVIA-BORB','Pesponto cabedal',1),('CAB-LIVIA-BORB','Material pronto cabedal',1),('CAB-LIVIA-BORB','Fivela por par',1),('CAB-LIVIA-BORB','Enfeite Borboleta',1),
  ('CAB-LIVIA-STRASS','TOBOX 4 mm',1),('CAB-LIVIA-STRASS','Forro sintético para palmilha',1),('CAB-LIVIA-STRASS','Saquinho de embalagem',1),('CAB-LIVIA-STRASS','Sola rasteira branca',1),('CAB-LIVIA-STRASS','Palmilha corte',1),('CAB-LIVIA-STRASS','Montagem sandália',1),('CAB-LIVIA-STRASS','Carimbo palmilha',1),('CAB-LIVIA-STRASS','Pesponto palmilha',1),('CAB-LIVIA-STRASS','Caixa',1),('CAB-LIVIA-STRASS','Corte cabedal sandália',1),('CAB-LIVIA-STRASS','Pesponto cabedal',1),('CAB-LIVIA-STRASS','Material pronto cabedal',1),('CAB-LIVIA-STRASS','Fivela por par',1),('CAB-LIVIA-STRASS','Enfeite Strass',1),
  ('CAB-AGATA','TOBOX 4 mm',1),('CAB-AGATA','Forro sintético para palmilha',1),('CAB-AGATA','Saquinho de embalagem',1),('CAB-AGATA','Sola rasteira branca',1),('CAB-AGATA','Palmilha corte',1),('CAB-AGATA','Montagem sandália',1),('CAB-AGATA','Carimbo palmilha',1),('CAB-AGATA','Pesponto palmilha',1),('CAB-AGATA','Caixa',1),('CAB-AGATA','Corte cabedal sandália',1),('CAB-AGATA','Pesponto cabedal',1),('CAB-AGATA','Material pronto cabedal',1),('CAB-AGATA','Fivela por par',1),('CAB-AGATA','Enfeite Ágata',1),
  ('CAB-CAROL','TOBOX 4 mm',1),('CAB-CAROL','Forro sintético para palmilha',1),('CAB-CAROL','Saquinho de embalagem',1),('CAB-CAROL','Sola rasteira branca',1),('CAB-CAROL','Palmilha corte',1),('CAB-CAROL','Montagem sandália',1),('CAB-CAROL','Carimbo palmilha',1),('CAB-CAROL','Pesponto palmilha',1),('CAB-CAROL','Caixa',1),('CAB-CAROL','Corte cabedal sandália',1),('CAB-CAROL','Pesponto cabedal',1),('CAB-CAROL','Material pronto cabedal',1),('CAB-CAROL','Fivela por par',1),('CAB-CAROL','Enfeite Carol',1),
  ('TENIS-CACHARREL','Palmilha corte',0.25),('TENIS-CACHARREL','Montagem tênis',1),('TENIS-CACHARREL','Corte cabedal tênis',1),('TENIS-CACHARREL','Saquinho de embalagem',1),('TENIS-CACHARREL','Waster',1),('TENIS-CACHARREL','Pesponto tênis',1),('TENIS-CACHARREL','Caixa',1),('TENIS-CACHARREL','Enfeite emborrachado',1),
  ('TENIS-NYLON','Palmilha corte',0.25),('TENIS-NYLON','Montagem tênis',1),('TENIS-NYLON','Corte cabedal tênis',1),('TENIS-NYLON','Saquinho de embalagem',1),('TENIS-NYLON','Waster',1),('TENIS-NYLON','Pesponto tênis',1),('TENIS-NYLON','Caixa',1)
)
INSERT INTO product_components(product_id,material_id,quantity)
SELECT p.id,m.id,c.quantity FROM components c
JOIN products p ON p.sku=c.sku JOIN materials m ON lower(m.name)=lower(c.material_name)
ON CONFLICT(product_id,material_id) DO UPDATE SET quantity=EXCLUDED.quantity;
