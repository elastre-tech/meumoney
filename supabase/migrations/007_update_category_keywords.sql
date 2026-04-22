-- ============================================
-- MeuMoney - adicionar keywords padrao faltantes
-- ============================================

WITH additions(name, type, new_keywords) AS (
  VALUES
    ('Alimentação', 'expense', ARRAY[
      'ifood', 'rappi', 'delivery', 'lanche', 'café', 'cafe', 'almoço', 'almoco',
      'janta', 'jantar'
    ]::text[]),
    ('Saúde', 'expense', ARRAY[
      'cabelo', 'salão', 'salao', 'manicure', 'unha', 'depilação', 'depilacao',
      'sobrancelha', 'academia', 'pilates', 'yoga', 'dentista', 'ortodontista',
      'psicólogo', 'psicologo', 'terapia', 'dermatologista'
    ]::text[]),
    ('Lazer', 'expense', ARRAY[
      'viagem', 'hotel', 'hospedagem', 'passagem', 'aeroporto', 'airbnb',
      'pousada', 'teatro', 'show', 'ingresso', 'parque'
    ]::text[]),
    ('Educação', 'expense', ARRAY[
      'creche', 'material', 'apostila', 'mentoria', 'workshop'
    ]::text[]),
    ('Serviços', 'expense', ARRAY[
      'celular', 'telefone', 'seguro', 'contador', 'contabilidade', 'advogado',
      'faxina', 'diarista', 'empregada'
    ]::text[]),
    ('Pets', 'expense', ARRAY[
      'cadelinha', 'cachorrinha', 'gatinha', 'gatinho', 'filhote', 'tosa',
      'banho pet', 'antipulga', 'vacina pet', 'vermifugo', 'vermífugo'
    ]::text[]),
    ('Outros', 'expense', ARRAY[
      'dízimo', 'dizimo', 'oferta', 'igreja', 'mesada', 'doação', 'doacao'
    ]::text[])
)
UPDATE public.categories AS c
SET keywords = (
  SELECT ARRAY(
    SELECT keyword
    FROM (
      SELECT keyword, MIN(ord) AS first_position
      FROM unnest(COALESCE(c.keywords, '{}'::text[]) || additions.new_keywords)
        WITH ORDINALITY AS keyword_list(keyword, ord)
      WHERE keyword IS NOT NULL AND keyword <> ''
      GROUP BY keyword
    ) AS deduped
    ORDER BY first_position
  )
)
FROM additions
WHERE c.name = additions.name
  AND c.type = additions.type
  AND c.is_default = true
  AND c.user_id IS NULL;
