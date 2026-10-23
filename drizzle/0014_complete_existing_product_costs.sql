ALTER TABLE products ADD COLUMN IF NOT EXISTS target_profit numeric(12,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku varchar(80);
--> statement-breakpoint
WITH catalog(name,supplier,cost_type,unit,purchase_price,purchase_quantity) AS (VALUES
  ('Montagem sandália','Produção própria','labor','PAR',3.50,1.00),
  ('Montagem tênis','Produção própria','labor','PAR',4.00,1.00),
  ('Elástico para tira','Fornecedor atual','material','PAR',1.358,1.00),
  ('Corte cabedal sandália','Produção própria','labor','PAR',0.60,1.00),
  ('Corte cabedal tênis','Produção própria','labor','PAR',0.50,1.00),
  ('Pesponto cabedal','Produção própria','labor','PAR',2.00,1.00),
  ('Material pronto cabedal','Almeida''s','material','PAR',48.40,44.00),
  ('Fivela por par','VL Bandeirantes','material','PAR',0.42,1.00),
  ('Enfeite Flor','Produção própria','service','PAR',1.52,1.00),
  ('Enfeite Laço','Produção própria','service','PAR',1.52,1.00),
  ('Enfeite Borboleta','Produção própria','service','PAR',1.52,1.00),
  ('Enfeite Strass','Produção própria','service','PAR',1.225,1.00),
  ('Enfeite Ágata','Produção própria','service','PAR',2.04,1.00),
  ('Enfeite Carol','Produção própria','service','PAR',1.59,1.00)
)
INSERT INTO materials(name,supplier,cost_type,unit,purchase_price,purchase_quantity)
SELECT c.* FROM catalog c
WHERE NOT EXISTS (SELECT 1 FROM materials m WHERE lower(m.name)=lower(c.name));
--> statement-breakpoint
UPDATE materials
SET cost_type = CASE
  WHEN lower(name) IN ('caixa','saquinho de embalagem') THEN 'packaging'
  WHEN lower(name) LIKE 'mão de obra%' OR lower(name) LIKE 'montagem%' THEN 'labor'
  WHEN lower(name) IN (
    'dublagem','palmilha corte','carimbo palmilha','pesponto palmilha',
    'pesponto cabedal','pesponto tênis','corte cabedal','corte cabedal sandália',
    'corte cabedal tênis','waster','enfeite flor','enfeite laço','enfeite borboleta',
    'enfeite strass','enfeite ágata','enfeite carol'
  ) THEN 'service'
  ELSE 'material'
END,
updated_at=NOW();
--> statement-breakpoint
UPDATE materials
SET cost_type='labor',updated_at=NOW()
WHERE lower(name) LIKE '%mão de obra%'
   OR lower(name) LIKE '%montagem%'
   OR lower(name) LIKE '%corte%'
   OR lower(name) LIKE '%pesponto%'
   OR lower(name) LIKE '%carimb%'
   OR lower(name) LIKE '%debrua%'
   OR lower(name)='waster';
--> statement-breakpoint
WITH components(sku,material_name,quantity) AS (VALUES
  ('ANA-OURO','TOBOX 4 mm',1),
  ('ANA-OURO','Forro sintético para palmilha',1),
  ('ANA-OURO','Saquinho de embalagem',1),
  ('ANA-OURO','Sola rasteira branca',1),
  ('ANA-OURO','Palmilha corte',1),
  ('ANA-OURO','Montagem sandália',1),
  ('ANA-OURO','Carimbo palmilha',1),
  ('ANA-OURO','Pesponto palmilha',1),
  ('ANA-OURO','Caixa',1),
  ('ANA-OURO','Elástico para tira',1),
  ('ANA-OURO','Tira Nice Ouro Light',0.97),

  ('LUIZA-CRISTAL','TOBOX 4 mm',1),
  ('LUIZA-CRISTAL','Forro sintético para palmilha',1),
  ('LUIZA-CRISTAL','Saquinho de embalagem',1),
  ('LUIZA-CRISTAL','Sola rasteira branca',1),
  ('LUIZA-CRISTAL','Palmilha corte',1),
  ('LUIZA-CRISTAL','Montagem sandália',1),
  ('LUIZA-CRISTAL','Carimbo palmilha',1),
  ('LUIZA-CRISTAL','Pesponto palmilha',1),
  ('LUIZA-CRISTAL','Caixa',1),
  ('LUIZA-CRISTAL','Elástico para tira',1),
  ('LUIZA-CRISTAL','Tira Mônaco Bco Cristal',0.97),

  ('PIETRA-COLMEIA','TOBOX 4 mm',1),
  ('PIETRA-COLMEIA','Forro sintético para palmilha',1),
  ('PIETRA-COLMEIA','Saquinho de embalagem',1),
  ('PIETRA-COLMEIA','Sola rasteira branca',1),
  ('PIETRA-COLMEIA','Palmilha corte',1),
  ('PIETRA-COLMEIA','Montagem sandália',1),
  ('PIETRA-COLMEIA','Carimbo palmilha',1),
  ('PIETRA-COLMEIA','Pesponto palmilha',1),
  ('PIETRA-COLMEIA','Caixa',1),
  ('PIETRA-COLMEIA','Elástico para tira',1),
  ('PIETRA-COLMEIA','Tira Colmeia 4mm Bco Cristal',1.07),

  ('PATRICIA-PARIS','TOBOX 4 mm',1),
  ('PATRICIA-PARIS','Forro sintético para palmilha',1),
  ('PATRICIA-PARIS','Saquinho de embalagem',1),
  ('PATRICIA-PARIS','Sola rasteira branca',1),
  ('PATRICIA-PARIS','Palmilha corte',1),
  ('PATRICIA-PARIS','Montagem sandália',1),
  ('PATRICIA-PARIS','Carimbo palmilha',1),
  ('PATRICIA-PARIS','Pesponto palmilha',1),
  ('PATRICIA-PARIS','Caixa',1),
  ('PATRICIA-PARIS','Elástico para tira',1),
  ('PATRICIA-PARIS','Tira Paris Camurça Bco/Cristal',0.99),

  ('LARA-DOURADO','TOBOX 4 mm',1),
  ('LARA-DOURADO','Forro sintético para palmilha',1),
  ('LARA-DOURADO','Saquinho de embalagem',1),
  ('LARA-DOURADO','Sola rasteira branca',1),
  ('LARA-DOURADO','Palmilha corte',1),
  ('LARA-DOURADO','Montagem sandália',1),
  ('LARA-DOURADO','Carimbo palmilha',1),
  ('LARA-DOURADO','Pesponto palmilha',1),
  ('LARA-DOURADO','Caixa',1),
  ('LARA-DOURADO','Elástico para tira',1),
  ('LARA-DOURADO','Trança Spectro Dourado',1),

  ('CAB-LIVIA-FLOR','TOBOX 4 mm',1),
  ('CAB-LIVIA-FLOR','Forro sintético para palmilha',1),
  ('CAB-LIVIA-FLOR','Saquinho de embalagem',1),
  ('CAB-LIVIA-FLOR','Sola rasteira branca',1),
  ('CAB-LIVIA-FLOR','Palmilha corte',1),
  ('CAB-LIVIA-FLOR','Montagem sandália',1),
  ('CAB-LIVIA-FLOR','Carimbo palmilha',1),
  ('CAB-LIVIA-FLOR','Pesponto palmilha',1),
  ('CAB-LIVIA-FLOR','Caixa',1),
  ('CAB-LIVIA-FLOR','Corte cabedal sandália',1),
  ('CAB-LIVIA-FLOR','Pesponto cabedal',1),
  ('CAB-LIVIA-FLOR','Material pronto cabedal',1),
  ('CAB-LIVIA-FLOR','Fivela por par',1),
  ('CAB-LIVIA-FLOR','Enfeite Flor',1),

  ('CAB-LIVIA-LACO','TOBOX 4 mm',1),
  ('CAB-LIVIA-LACO','Forro sintético para palmilha',1),
  ('CAB-LIVIA-LACO','Saquinho de embalagem',1),
  ('CAB-LIVIA-LACO','Sola rasteira branca',1),
  ('CAB-LIVIA-LACO','Palmilha corte',1),
  ('CAB-LIVIA-LACO','Montagem sandália',1),
  ('CAB-LIVIA-LACO','Carimbo palmilha',1),
  ('CAB-LIVIA-LACO','Pesponto palmilha',1),
  ('CAB-LIVIA-LACO','Caixa',1),
  ('CAB-LIVIA-LACO','Corte cabedal sandália',1),
  ('CAB-LIVIA-LACO','Pesponto cabedal',1),
  ('CAB-LIVIA-LACO','Material pronto cabedal',1),
  ('CAB-LIVIA-LACO','Fivela por par',1),
  ('CAB-LIVIA-LACO','Enfeite Laço',1),

  ('CAB-LIVIA-BORB','TOBOX 4 mm',1),
  ('CAB-LIVIA-BORB','Forro sintético para palmilha',1),
  ('CAB-LIVIA-BORB','Saquinho de embalagem',1),
  ('CAB-LIVIA-BORB','Sola rasteira branca',1),
  ('CAB-LIVIA-BORB','Palmilha corte',1),
  ('CAB-LIVIA-BORB','Montagem sandália',1),
  ('CAB-LIVIA-BORB','Carimbo palmilha',1),
  ('CAB-LIVIA-BORB','Pesponto palmilha',1),
  ('CAB-LIVIA-BORB','Caixa',1),
  ('CAB-LIVIA-BORB','Corte cabedal sandália',1),
  ('CAB-LIVIA-BORB','Pesponto cabedal',1),
  ('CAB-LIVIA-BORB','Material pronto cabedal',1),
  ('CAB-LIVIA-BORB','Fivela por par',1),
  ('CAB-LIVIA-BORB','Enfeite Borboleta',1),

  ('CAB-LIVIA-STRASS','TOBOX 4 mm',1),
  ('CAB-LIVIA-STRASS','Forro sintético para palmilha',1),
  ('CAB-LIVIA-STRASS','Saquinho de embalagem',1),
  ('CAB-LIVIA-STRASS','Sola rasteira branca',1),
  ('CAB-LIVIA-STRASS','Palmilha corte',1),
  ('CAB-LIVIA-STRASS','Montagem sandália',1),
  ('CAB-LIVIA-STRASS','Carimbo palmilha',1),
  ('CAB-LIVIA-STRASS','Pesponto palmilha',1),
  ('CAB-LIVIA-STRASS','Caixa',1),
  ('CAB-LIVIA-STRASS','Corte cabedal sandália',1),
  ('CAB-LIVIA-STRASS','Pesponto cabedal',1),
  ('CAB-LIVIA-STRASS','Material pronto cabedal',1),
  ('CAB-LIVIA-STRASS','Fivela por par',1),
  ('CAB-LIVIA-STRASS','Enfeite Strass',1),

  ('CAB-AGATA','TOBOX 4 mm',1),
  ('CAB-AGATA','Forro sintético para palmilha',1),
  ('CAB-AGATA','Saquinho de embalagem',1),
  ('CAB-AGATA','Sola rasteira branca',1),
  ('CAB-AGATA','Palmilha corte',1),
  ('CAB-AGATA','Montagem sandália',1),
  ('CAB-AGATA','Carimbo palmilha',1),
  ('CAB-AGATA','Pesponto palmilha',1),
  ('CAB-AGATA','Caixa',1),
  ('CAB-AGATA','Corte cabedal sandália',1),
  ('CAB-AGATA','Pesponto cabedal',1),
  ('CAB-AGATA','Material pronto cabedal',1),
  ('CAB-AGATA','Fivela por par',1),
  ('CAB-AGATA','Enfeite Ágata',1),

  ('CAB-CAROL','TOBOX 4 mm',1),
  ('CAB-CAROL','Forro sintético para palmilha',1),
  ('CAB-CAROL','Saquinho de embalagem',1),
  ('CAB-CAROL','Sola rasteira branca',1),
  ('CAB-CAROL','Palmilha corte',1),
  ('CAB-CAROL','Montagem sandália',1),
  ('CAB-CAROL','Carimbo palmilha',1),
  ('CAB-CAROL','Pesponto palmilha',1),
  ('CAB-CAROL','Caixa',1),
  ('CAB-CAROL','Corte cabedal sandália',1),
  ('CAB-CAROL','Pesponto cabedal',1),
  ('CAB-CAROL','Material pronto cabedal',1),
  ('CAB-CAROL','Fivela por par',1),
  ('CAB-CAROL','Enfeite Carol',1),

  ('TENIS-CACHARREL','Palmilha corte',0.25),
  ('TENIS-CACHARREL','Montagem tênis',1),
  ('TENIS-CACHARREL','Corte cabedal tênis',1),
  ('TENIS-CACHARREL','Saquinho de embalagem',1),
  ('TENIS-CACHARREL','Waster',1),
  ('TENIS-CACHARREL','Sola All Star',1),
  ('TENIS-CACHARREL','Pesponto tênis',1),
  ('TENIS-CACHARREL','Caixa',1),
  ('TENIS-CACHARREL','Enfeite emborrachado',1),
  ('TENIS-CACHARREL','Forro Cacharrel',2),
  ('TENIS-CACHARREL','EVA palmilha forrado 4mm',1),

  ('TENIS-NYLON','Palmilha corte',0.25),
  ('TENIS-NYLON','Montagem tênis',1),
  ('TENIS-NYLON','Corte cabedal tênis',1),
  ('TENIS-NYLON','Saquinho de embalagem',1),
  ('TENIS-NYLON','Waster',1),
  ('TENIS-NYLON','Sola All Star',1),
  ('TENIS-NYLON','Pesponto tênis',1),
  ('TENIS-NYLON','Caixa',1),
  ('TENIS-NYLON','Forro Nylon',1),
  ('TENIS-NYLON','Forro Cacharrel',1),
  ('TENIS-NYLON','EVA palmilha forrado 4mm',1)
)
INSERT INTO product_components(product_id,material_id,quantity,waste_percent)
SELECT p.id,m.id,c.quantity,0
FROM components c
JOIN products p ON p.sku=c.sku
JOIN materials m ON lower(m.name)=lower(c.material_name)
ON CONFLICT(product_id,material_id) DO UPDATE
SET quantity=EXCLUDED.quantity,waste_percent=EXCLUDED.waste_percent;
--> statement-breakpoint
DELETE FROM product_components pc
USING products p, materials m
WHERE pc.product_id=p.id AND pc.material_id=m.id
  AND p.sku='TENIS-NYLON' AND lower(m.name)='enfeite emborrachado';
--> statement-breakpoint
UPDATE products SET current_price=CASE sku
  WHEN 'LARA-DOURADO' THEN 37.99
  WHEN 'PATRICIA-PARIS' THEN 34.99
  WHEN 'PIETRA-COLMEIA' THEN 33.99
  ELSE current_price END
WHERE sku IN ('LARA-DOURADO','PATRICIA-PARIS','PIETRA-COLMEIA');
--> statement-breakpoint
UPDATE products SET target_profit=7
WHERE sku IN ('TENIS-CACHARREL','TENIS-NYLON');
--> statement-breakpoint
DO $$
DECLARE missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM (VALUES
    ('ANA-OURO',11),('LUIZA-CRISTAL',11),('PIETRA-COLMEIA',11),
    ('PATRICIA-PARIS',11),('LARA-DOURADO',11),
    ('CAB-LIVIA-FLOR',14),('CAB-LIVIA-LACO',14),('CAB-LIVIA-BORB',14),
    ('CAB-LIVIA-STRASS',14),('CAB-AGATA',14),('CAB-CAROL',14),
    ('TENIS-CACHARREL',11),('TENIS-NYLON',11)
  ) expected(sku,component_count)
  LEFT JOIN products p ON p.sku=expected.sku
  WHERE p.id IS NULL OR (
    SELECT COUNT(*) FROM product_components pc WHERE pc.product_id=p.id
  ) < expected.component_count;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Não foi possível completar as composições dos produtos: % modelo(s) ainda sem todos os componentes.', missing_count;
  END IF;
END $$;
--> statement-breakpoint
UPDATE orders
SET service_type_id = NULL
WHERE service_type_id IN (
  SELECT id FROM service_types WHERE upper(name) = 'CORTE'
);
--> statement-breakpoint
DELETE FROM service_types WHERE upper(name) = 'CORTE';
--> statement-breakpoint
ALTER TABLE orders ALTER COLUMN order_type DROP DEFAULT;
--> statement-breakpoint
DELETE FROM product_components pc
USING products p, materials m
WHERE pc.product_id = p.id
  AND pc.material_id = m.id
  AND p.sku IN (
    'ANA-OURO','LUIZA-CRISTAL','PIETRA-COLMEIA','PATRICIA-PARIS','LARA-DOURADO',
    'CAB-LIVIA-FLOR','CAB-LIVIA-LACO','CAB-LIVIA-BORB','CAB-LIVIA-STRASS','CAB-AGATA','CAB-CAROL',
    'TENIS-CACHARREL','TENIS-NYLON'
  )
  AND lower(m.name) IN ('montagem','corte cabedal');
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM products GROUP BY name HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Não é possível preencher o SKU pelo nome: existem produtos com nomes duplicados.';
  END IF;
END $$;
--> statement-breakpoint
UPDATE products SET sku=name WHERE sku IS DISTINCT FROM name;
--> statement-breakpoint
ALTER TABLE products ALTER COLUMN sku SET NOT NULL;
