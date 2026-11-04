/* VERSÃO PUBLICADA (04/11/2026)

   O app aberto compara o carimbo que ele carrega (NEXT_PUBLIC_APP_VERSAO,
   embutido no JavaScript dele) com este, que sai do build que está NO AR.
   Diferente = tem versão nova → AtualizadorPWA recarrega sozinho.

   force-static: vira arquivo no build, servido pelo CDN sem ligar função
   (CPU da Vercel). Cada deploy publica o seu. O navegador não guarda
   (header no-store em next.config.ts) e o middleware não roda aqui. */

export const dynamic = 'force-static'

export function GET() {
  return Response.json({
    versao: process.env.NEXT_PUBLIC_APP_VERSAO ?? 'desconhecida',
    commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? 'local',
  })
}
