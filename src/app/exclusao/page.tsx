export default function ExclusaoPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">MeuMoney</h1>
        </header>

        <h2 className="text-3xl font-bold text-gray-900 mb-8">Exclusão de Dados</h2>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <p>
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018), você
              tem o direito de solicitar a exclusão completa dos seus dados pessoais armazenados no
              MeuMoney a qualquer momento.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Como solicitar a exclusão</h3>
            <p>Existem duas formas de solicitar a exclusão dos seus dados:</p>

            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1">Opção 1: Pelo WhatsApp</h4>
                <p>
                  Envie a mensagem <strong>&quot;excluir meus dados&quot;</strong> para o número do
                  MeuMoney no WhatsApp. O sistema pedirá uma confirmação e, após confirmar, seus
                  dados serão excluídos <strong>imediatamente</strong>.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1">Opção 2: Por email</h4>
                <p>
                  Envie um email para{' '}
                  <a href="mailto:alo@elastre.com.br" className="text-blue-600 underline">alo@elastre.com.br</a>{' '}
                  com o assunto &quot;Exclusão de dados&quot; informando o número de telefone
                  cadastrado. A exclusão será realizada em até <strong>48 horas</strong>.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">O que é excluído</h3>
            <p>Ao solicitar a exclusão, os seguintes dados são removidos permanentemente:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Todas as transações registradas (gastos e receitas)</li>
              <li>Todas as mensagens trocadas com o MeuMoney</li>
              <li>Relatórios mensais gerados</li>
              <li>Categorias personalizadas criadas</li>
              <li>Dados de perfil (nome, telefone)</li>
              <li>Fotos de recibos e arquivos de áudio armazenados</li>
            </ul>
          </section>

          <section>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Atenção</h3>
              <p className="text-red-800">
                A exclusão de dados é <strong>permanente e irrecuperável</strong>. Após a
                confirmação, não é possível restaurar nenhuma informação. Se desejar manter um
                registro dos seus dados, utilize o comando <strong>&quot;exportar&quot;</strong> no
                WhatsApp antes de solicitar a exclusão.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dúvidas</h3>
            <p>
              Para qualquer dúvida sobre a exclusão de dados ou sobre seus direitos como titular,
              entre em contato pelo email{' '}
              <a href="mailto:alo@elastre.com.br" className="text-blue-600 underline">alo@elastre.com.br</a>.
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
