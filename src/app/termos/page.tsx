export default function TermosPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">MeuMoney</h1>
        </header>

        <h2 className="text-3xl font-bold text-gray-900 mb-8">Termos de Serviço</h2>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. O serviço</h3>
            <p>
              O MeuMoney é uma plataforma de gestão financeira pessoal que funciona via WhatsApp,
              permitindo que o usuário registre gastos e receitas por meio de mensagens de texto,
              fotos de recibos ou áudios, com acesso à sua conta no MeuMoney para visualização dos dados.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Operador</h3>
            <p>
              O MeuMoney é operado por <strong>Elastre Consultoria Digital</strong>, inscrita no CNPJ
              41.338.298/0001-21. Para questões relacionadas ao serviço, entre em contato pelo
              email <a href="mailto:alo@elastre.com.br" className="text-blue-600 underline">alo@elastre.com.br</a>.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Elegibilidade</h3>
            <p>
              O uso do MeuMoney é restrito a maiores de 18 anos. Ao utilizar o serviço, você declara
              ter a capacidade legal para aceitar estes termos.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Responsabilidade do usuário</h3>
            <p>
              Os dados financeiros informados ao MeuMoney são de inteira responsabilidade do usuário.
              O usuário é responsável pela veracidade e precisão das informações que registra na
              plataforma.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Limitação de responsabilidade</h3>
            <p>
              O MeuMoney é uma ferramenta de organização financeira pessoal. O serviço <strong>não
              constitui serviço financeiro</strong>, não oferece consultoria financeira, de investimentos
              ou de qualquer outra natureza, e não se responsabiliza por decisões financeiras tomadas
              pelo usuário com base nos dados registrados na plataforma.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Disponibilidade</h3>
            <p>
              O MeuMoney se esforça para manter o serviço disponível continuamente, mas não garante
              uptime de 100%. O serviço pode ficar indisponível temporariamente para manutenção,
              atualizações ou por motivos de força maior.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Preço</h3>
            <p>
              O MeuMoney oferece um período de teste gratuito. O plano premium custa
              <strong> R$ 24,90 por mês</strong>. Os valores podem ser alterados com aviso prévio
              de 30 dias aos usuários ativos.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Cancelamento</h3>
            <p>
              O usuário pode cancelar o serviço e solicitar a exclusão completa dos seus dados a
              qualquer momento, de duas formas:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Enviando <strong>&quot;excluir meus dados&quot;</strong> pelo WhatsApp do MeuMoney</li>
              <li>Enviando email para <a href="mailto:alo@elastre.com.br" className="text-blue-600 underline">alo@elastre.com.br</a></li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">9. Alterações nos termos</h3>
            <p>
              Estes termos podem ser atualizados periodicamente. Alterações significativas serão
              comunicadas aos usuários. O uso continuado do serviço após as alterações constitui
              aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">10. Vigência</h3>
            <p>
              Estes termos de serviço entram em vigor em abril de 2026.
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
