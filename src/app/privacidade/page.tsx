export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">MeuMoney</h1>
        </header>

        <h2 className="text-3xl font-bold text-gray-900 mb-8">Pol&iacute;tica de Privacidade</h2>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Responsável</h3>
            <p>
              O MeuMoney é operado por <strong>Elastre Consultoria Digital</strong>, inscrita no CNPJ
              41.338.298/0001-21. Para questões relacionadas a esta política, entre em contato pelo
              email <a href="mailto:alo@elastre.com.br" className="text-blue-600 underline">alo@elastre.com.br</a>.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Dados coletados</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Número de telefone (WhatsApp)</li>
              <li>Nome do perfil do WhatsApp</li>
              <li>Dados financeiros informados voluntariamente pelo usuário: valores, descrições de gastos e receitas, fotos de recibos e mensagens de áudio</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Finalidade</h3>
            <p>
              Os dados coletados são utilizados exclusivamente para a organização financeira pessoal
              do usuário, incluindo registro de transações, categorização de gastos e geração de
              relatórios financeiros.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Armazenamento e segurança</h3>
            <p>
              Os dados são armazenados em banco de dados Supabase com criptografia em trânsito (TLS)
              e em repouso, hospedado em servidores da Amazon Web Services (AWS). O acesso ao banco
              de dados é protegido por políticas de segurança em nível de linha (Row Level Security).
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Compartilhamento de dados</h3>
            <p>
              Seus dados <strong>não são vendidos ou compartilhados com terceiros</strong>. As APIs
              de inteligência artificial (Anthropic) processam mensagens exclusivamente para fins de
              classificação e extração de dados financeiros, sem armazenar as informações processadas.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Retenção de dados</h3>
            <p>
              Os dados são mantidos enquanto a conta do usuário estiver ativa. Após a exclusão da
              conta, todos os dados são removidos de forma permanente e irrecuperável.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Direitos do titular (LGPD)</h3>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem
              direito a:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Acesso:</strong> consultar todos os dados que armazenamos sobre você</li>
              <li><strong>Correção:</strong> solicitar a correção de dados incompletos ou incorretos</li>
              <li><strong>Exclusão:</strong> solicitar a exclusão completa dos seus dados</li>
              <li><strong>Portabilidade:</strong> exportar seus dados em formato CSV</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Como exercer seus direitos</h3>
            <p>
              Você pode exercer seus direitos de duas formas:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Enviando <strong>&quot;excluir meus dados&quot;</strong> pelo WhatsApp do MeuMoney</li>
              <li>Enviando email para <a href="mailto:alo@elastre.com.br" className="text-blue-600 underline">alo@elastre.com.br</a></li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">9. Vigência</h3>
            <p>
              Esta política de privacidade entra em vigor em abril de 2026 e pode ser atualizada
              periodicamente. Alterações significativas serão comunicadas aos usuários.
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p>Elastre Consultoria Digital — <a href="mailto:alo@elastre.com.br" className="underline">alo@elastre.com.br</a></p>
        </footer>
      </div>
    </div>
  )
}
