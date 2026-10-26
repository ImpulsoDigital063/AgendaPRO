/* ═══════════════════════════════════════════════════════════════
   Pergunte ao seu negócio · atalhos "como faço" (26/10/2026)

   Nem tudo que a dona digita é pergunta de número. Ivna (22/10):
   "quero mudar valores dos serviços de uma profissional" — é pedido de
   AÇÃO. Em vez de "não entendi", a busca leva pra tela certa com uma
   frase de como fazer. Sem IA, mesma busca por palavra-chave.

   Este arquivo roda no navegador: só dado e texto aqui.
   ═══════════════════════════════════════════════════════════════ */

export type Atalho = {
  id: string
  titulo: string
  /** Uma frase de como fazer, na tela de destino. */
  passo: string
  href: string
  rotulo: string
  /** Palavras e trechos (sem acento, minúsculo). */
  palavras: string[]
}

export const ATALHOS: Atalho[] = [
  { id: 'servico_preco', titulo: 'Mudar preço ou duração de serviço', href: '/admin/configuracoes?tab=servicos', rotulo: 'Abrir Serviços',
    passo: 'Em Serviços, toque no serviço pra mudar nome, preço e duração. O preço fica no cadastro do serviço.',
    palavras: ['servico', 'servicos', 'valor', 'valores', 'preco', 'precos', 'valor do servico', 'valores dos servicos', 'valores do servico', 'valor dos servicos', 'mudar valor', 'mudar valores', 'alterar valor', 'trocar valor', 'duracao', 'tabela de preco'] },
  { id: 'servico_novo', titulo: 'Cadastrar serviço', href: '/admin/configuracoes?tab=servicos', rotulo: 'Abrir Serviços',
    passo: 'Em Serviços, toque em adicionar e preencha nome, preço e duração.',
    palavras: ['cadastrar servico', 'cadastrar um servico', 'servico novo', 'novo servico', 'adicionar servico', 'criar servico', 'incluir servico', 'colocar servico', 'tirar servico', 'excluir servico', 'apagar servico'] },
  { id: 'profissional', titulo: 'Cadastrar ou editar profissional', href: '/admin/configuracoes?tab=profissionais', rotulo: 'Abrir Colaboradores',
    passo: 'Em Colaboradores, toque em adicionar ou na pessoa pra mudar dados, serviços que ela faz e comissão.',
    palavras: ['cadastrar profissional', 'nova profissional', 'novo profissional', 'adicionar profissional', 'colaborador', 'colaboradora', 'funcionaria', 'funcionario', 'editar profissional', 'mudar comissao', 'alterar comissao', 'porcentagem'] },
  { id: 'horarios', titulo: 'Mudar horário de funcionamento', href: '/admin/configuracoes?tab=horarios', rotulo: 'Abrir Horários',
    passo: 'Em Horários, escolha os dias e as horas que o negócio abre.',
    palavras: ['horario de funcionamento', 'mudar horario', 'alterar horario', 'abrir mais cedo', 'fechar mais tarde', 'dia de folga', 'abrir no sabado', 'abrir no domingo', 'expediente'] },
  { id: 'bloqueio', titulo: 'Bloquear um horário ou dia', href: '/admin/configuracoes?tab=bloqueios', rotulo: 'Abrir Bloqueios',
    passo: 'Em Bloqueios, escolha o dia e as horas em que ninguém pode agendar.',
    palavras: ['bloquear', 'bloqueio', 'fechar agenda', 'fechar o dia', 'feriado', 'ferias', 'nao atender', 'travar horario'] },
  { id: 'agendar', titulo: 'Marcar um horário pra cliente', href: '/admin/marcar', rotulo: 'Marcar horário',
    passo: 'Escolha a cliente, o serviço, a profissional e o horário.',
    palavras: ['marcar horario', 'agendar cliente', 'fazer agendamento', 'novo agendamento', 'encaixar', 'encaixe', 'marcar cliente'] },
  { id: 'despesa', titulo: 'Lançar despesa', href: '/admin/financeiro/despesas', rotulo: 'Abrir Despesas',
    passo: 'Em Despesas, toque em adicionar. Marque como paga pra entrar no lucro.',
    palavras: ['lanco', 'lancar', 'lancar despesa', 'registrar despesa', 'nova despesa', 'adicionar despesa', 'cadastrar despesa', 'colocar despesa', 'lancar gasto', 'anotar gasto'] },
  { id: 'vender_produto', titulo: 'Vender produto', href: '/admin/produtos/vender', rotulo: 'Vender produto',
    passo: 'Escolha o produto e toque em "Escolher cliente": a compra entra no caixa e na ficha dela.',
    palavras: ['vender produto', 'venda de produto sem', 'vender sem atendimento', 'registrar venda'] },
  { id: 'produto', titulo: 'Cadastrar produto ou estoque', href: '/admin/produtos', rotulo: 'Abrir Produtos',
    passo: 'Em Produtos, toque em adicionar ou no produto pra mudar preço e estoque.',
    palavras: ['cadastrar produto', 'novo produto', 'estoque', 'entrada de produto', 'preco do produto', 'mudar produto'] },
  { id: 'cupom', titulo: 'Criar cupom de desconto', href: '/admin/cupons', rotulo: 'Abrir Cupons',
    passo: 'Em Cupons, crie o código, o desconto e até quando vale.',
    palavras: ['criar cupom', 'cupom', 'codigo de desconto', 'promocao', 'dar desconto'] },
  { id: 'aviso', titulo: 'Mandar mensagem pras clientes', href: '/admin/avisos-manuais', rotulo: 'Abrir Avisos manuais',
    passo: 'Em Avisos manuais, escolha quem recebe e mande pelo WhatsApp.',
    palavras: ['mandar mensagem', 'enviar mensagem', 'avisar clientes', 'mensagem pras clientes', 'disparar', 'whatsapp pras clientes', 'chamar de volta'] },
  { id: 'lembrete', titulo: 'Ligar lembrete automático', href: '/admin/whatsapp', rotulo: 'Abrir Avisos automáticos',
    passo: 'Em Avisos automáticos, ligue o lembrete e a confirmação de horário.',
    palavras: ['lembrete', 'mensagem automatica', 'confirmacao automatica', 'aviso automatico', 'lembrar cliente'] },
  { id: 'cliente', titulo: 'Cadastrar ou editar cliente', href: '/admin/clientes', rotulo: 'Abrir Clientes',
    passo: 'Em Clientes, toque em adicionar ou na cliente pra ver e mudar a ficha dela.',
    palavras: ['cadastrar cliente', 'nova cliente', 'adicionar cliente', 'editar cliente', 'ficha da cliente', 'telefone da cliente', 'importar clientes'] },
  { id: 'link', titulo: 'Divulgar o link de agendamento', href: '/admin/configuracoes?tab=divulgacao', rotulo: 'Abrir Divulgação',
    passo: 'Em Divulgação está o seu link e o QR Code pra colocar no Instagram e no WhatsApp.',
    palavras: ['meu link', 'link de agendamento', 'divulgar', 'qr code', 'bio do instagram', 'link da agenda'] },
  { id: 'fidelidade', titulo: 'Configurar pontos de fidelidade', href: '/admin/configuracoes?tab=fidelidade', rotulo: 'Abrir Fidelidade',
    passo: 'Em Fidelidade, escolha quantos pontos cada real vale e as recompensas.',
    palavras: ['configurar pontos', 'programa de fidelidade', 'mudar pontos', 'recompensas'] },
  { id: 'maquininha', titulo: 'Cadastrar taxa da maquininha', href: '/admin/configuracoes?tab=maquininhas', rotulo: 'Abrir Maquininhas',
    passo: 'Em Maquininhas, coloque a taxa de débito e crédito pra o Financeiro descontar certo.',
    palavras: ['cadastrar maquininha', 'taxa da maquininha', 'mudar taxa', 'configurar taxa', 'cadastrar taxa'] },
]

/** Verbo de ação no texto: "mudar", "como faço", "onde"... favorece atalho sobre pergunta. */
export const VERBO_DE_ACAO = / (como (eu )?(faco|fazer|coloco|mudo|cadastro|lanco|crio)|onde (eu )?(fica|mudo|vejo|coloco)|quero (mudar|trocar|alterar|cadastrar|colocar|tirar|criar|lancar|bloquear|mandar)|mudar|trocar|alterar|cadastrar|adicionar|criar|editar|lancar|bloquear|excluir|apagar|configurar|registrar) /
