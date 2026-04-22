-- ============================================
-- MeuMoney — Migração: corrigir acentuação das categorias
-- Rodar no Supabase SQL Editor
-- ============================================

-- Corrigir nomes sem acento para nomes com acento
UPDATE public.categories SET name = 'Alimentação' WHERE name = 'Alimentacao' AND is_default = true;
UPDATE public.categories SET name = 'Saúde' WHERE name = 'Saude' AND is_default = true;
UPDATE public.categories SET name = 'Educação' WHERE name = 'Educacao' AND is_default = true;
UPDATE public.categories SET name = 'Salário' WHERE name = 'Salario' AND is_default = true;

-- Atualizar keywords para incluir acentos
UPDATE public.categories SET keywords = array['mercado', 'supermercado', 'restaurante', 'lanche', 'almoço', 'jantar', 'café', 'padaria', 'ifood', 'rappi', 'feira', 'açougue', 'hortifruti', 'pizza', 'hambúrguer', 'sushi', 'comida'] WHERE name = 'Alimentação' AND is_default = true;
UPDATE public.categories SET keywords = array['uber', '99', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'ônibus', 'metrô', 'trem', 'táxi', 'moto', 'posto', 'etanol', 'diesel', 'manutenção carro'] WHERE name = 'Transporte' AND is_default = true;
UPDATE public.categories SET keywords = array['aluguel', 'condomínio', 'iptu', 'luz', 'água', 'gás', 'internet', 'energia', 'conta de luz', 'conta de água', 'celular', 'telefone', 'wifi'] WHERE name = 'Moradia' AND is_default = true;
UPDATE public.categories SET keywords = array['farmácia', 'remédio', 'médico', 'consulta', 'exame', 'dentista', 'hospital', 'plano de saúde', 'academia', 'drogaria', 'medicamento'] WHERE name = 'Saúde' AND is_default = true;
UPDATE public.categories SET keywords = array['faculdade', 'curso', 'escola', 'livro', 'material', 'mensalidade', 'udemy', 'alura', 'inglês', 'aula'] WHERE name = 'Educação' AND is_default = true;
UPDATE public.categories SET keywords = array['cinema', 'netflix', 'spotify', 'jogo', 'viagem', 'bar', 'festa', 'show', 'teatro', 'parque', 'streaming', 'assinatura', 'hobby'] WHERE name = 'Lazer' AND is_default = true;
UPDATE public.categories SET keywords = array['roupa', 'sapato', 'shopping', 'presente', 'eletrônico', 'celular', 'amazon', 'shopee', 'mercado livre', 'magalu', 'shein'] WHERE name = 'Compras' AND is_default = true;
UPDATE public.categories SET keywords = array['ração', 'veterinário', 'pet', 'petshop', 'cachorro', 'gato', 'banho', 'tosa', 'vacina pet'] WHERE name = 'Pets' AND is_default = true;
UPDATE public.categories SET keywords = array['salário', 'salario', 'holerite', 'pagamento', 'contracheque', 'folha'] WHERE name = 'Salário' AND is_default = true;
UPDATE public.categories SET keywords = array['freelance', 'freela', 'job', 'projeto', 'consultoria', 'serviço', 'bico', 'extra'] WHERE name = 'Freelance' AND is_default = true;
UPDATE public.categories SET keywords = array['dividendo', 'rendimento', 'juros', 'investimento', 'ação', 'fundo', 'cdb', 'tesouro', 'poupança'] WHERE name = 'Investimentos' AND is_default = true;

-- Inserir categorias que faltam (se não existirem)
INSERT INTO public.categories (name, type, icon, keywords, is_default)
SELECT 'Vestuário', 'expense', '👕', array['tênis', 'tenis', 'loja', 'camiseta', 'calça', 'vestido', 'blusa', 'jaqueta'], true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Vestuário' AND is_default = true);

INSERT INTO public.categories (name, type, icon, keywords, is_default)
SELECT 'Serviços', 'expense', '⚡', array['conta', 'fatura', 'parcela', 'boleto'], true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Serviços' AND is_default = true);
