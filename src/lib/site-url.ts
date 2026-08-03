/* ═══════════════════════════════════════════════════════════════
   SITE_URL — o endereço CANÔNICO, usado só onde robô lê

   Achado em 03/08/2026, minutos antes de enviar o sitemap ao Search Console:
   o site responde em www.agendapro.net.br e o apex (sem www) devolve 307 pra
   ele. Só que NEXT_PUBLIC_APP_URL está gravado SEM www — então sitemap,
   robots, llms.txt e todos os @id do JSON-LD apontavam pra um endereço que
   redireciona.

   Efeito prático: o Google marcaria as 42 URLs como "Página com
   redirecionamento", indexaria mais devagar e dividiria o sinal entre dois
   endereços do mesmo site.

   Por que uma constante nova em vez de corrigir o env: NEXT_PUBLIC_APP_URL é
   usado em e-mail, cupom, convite de profissional e retorno do checkout. São
   fluxos que funcionam (o 307 resolve) e não têm relação com SEO — trocar o
   env por causa de robô é espalhar risco em cima de coisa que paga a conta.
   Aqui o alcance é só o que o crawler consome.

   Continua saindo do env: em preview e dev a URL segue a do ambiente. A
   normalização só age quando o host é o apex de produção.
   ═══════════════════════════════════════════════════════════════ */

const bruto = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.agendapro.net.br').replace(/\/$/, '')

export const SITE_URL = bruto.replace('://agendapro.net.br', '://www.agendapro.net.br')
