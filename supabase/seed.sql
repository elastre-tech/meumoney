-- Categorias padrão (type é obrigatório no schema atual)
INSERT INTO categories (name, type, icon, keywords, is_default) VALUES
-- Despesas
('Alimentação', 'expense', '🍔', array['mercado', 'supermercado', 'restaurante', 'lanche', 'almoço', 'jantar', 'café', 'padaria', 'ifood', 'feira', 'açougue', 'hortifruti', 'pizza', 'rappi', 'delivery', 'cafe', 'almoco', 'janta'], true),
('Transporte', 'expense', '🚗', array['uber', '99', 'gasolina', 'combustível', 'estacionamento', 'ônibus', 'metrô', 'táxi', 'posto'], true),
('Moradia', 'expense', '🏠', array['aluguel', 'condomínio', 'iptu', 'luz', 'água', 'gás', 'internet', 'energia', 'celular'], true),
('Saúde', 'expense', '🏥', array['farmácia', 'remédio', 'médico', 'consulta', 'exame', 'dentista', 'hospital', 'academia', 'cabelo', 'salão', 'salao', 'manicure', 'unha', 'depilação', 'depilacao', 'sobrancelha', 'pilates', 'yoga', 'ortodontista', 'psicólogo', 'psicologo', 'terapia', 'dermatologista'], true),
('Educação', 'expense', '📚', array['faculdade', 'curso', 'escola', 'livro', 'material', 'mensalidade', 'creche', 'apostila', 'mentoria', 'workshop'], true),
('Lazer', 'expense', '🎮', array['cinema', 'netflix', 'spotify', 'jogo', 'viagem', 'bar', 'festa', 'show', 'hotel', 'hospedagem', 'passagem', 'aeroporto', 'airbnb', 'pousada', 'teatro', 'ingresso', 'parque'], true),
('Compras', 'expense', '🛍️', array['roupa', 'sapato', 'shopping', 'presente', 'amazon', 'shopee', 'shein', 'magalu'], true),
('Pets', 'expense', '🐾', array['ração', 'veterinário', 'pet', 'petshop', 'cachorro', 'gato', 'cadelinha', 'cachorrinha', 'gatinha', 'gatinho', 'filhote', 'tosa', 'banho pet', 'antipulga', 'vacina pet', 'vermifugo', 'vermífugo'], true),
('Vestuário', 'expense', '👕', array['roupa', 'sapato', 'tênis', 'loja'], true),
('Serviços', 'expense', '⚡', array['conta', 'fatura', 'parcela', 'boleto', 'celular', 'telefone', 'seguro', 'contador', 'contabilidade', 'advogado', 'faxina', 'diarista', 'empregada'], true),
('Outros', 'expense', '📦', array['dízimo', 'dizimo', 'oferta', 'igreja', 'mesada', 'doação', 'doacao'], true),
-- Receitas
('Salário', 'income', '💼', array['salário', 'salario', 'holerite', 'pagamento', 'contracheque'], true),
('Freelance', 'income', '💻', array['freelance', 'freela', 'job', 'projeto', 'consultoria', 'bico'], true),
('Investimentos', 'income', '📈', array['dividendo', 'rendimento', 'juros', 'investimento', 'poupança', 'cdb', 'tesouro'], true),
('Vendas', 'income', '🏷️', array['venda', 'vendi', 'vendido'], true),
('Comissão', 'income', '💸', array['comissão', 'comissao'], true),
('Outros', 'income', '💰', array[]::text[], true);
