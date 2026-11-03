/**
 * POST /api/lgpd/delete-me — DESLIGADA (03/11/2026)
 *
 * Esta rota apagava, sem login, a ficha e TODOS os atendimentos (inclusive o
 * histórico financeiro) de quem tivesse o slug do negócio + o telefone da
 * cliente. Telefone não prova que quem pede é a titular: qualquer pessoa que
 * soubesse o número de uma cliente conseguia apagar o histórico dela.
 *
 * Nenhuma tela do produto chamava esta rota, e a política de privacidade
 * (/privacidade, seção 6) já manda o titular pedir pelo e-mail
 * contato@impulsodigital063.com, com prazo de até 30 dias úteis. O pedido
 * segue por esse canal, com conferência humana de identidade.
 *
 * Se um dia voltar a ser automática, precisa de prova de posse do número
 * (código por WhatsApp/SMS) e registro de auditoria do que foi apagado.
 */
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'pedido_por_email',
      message:
        'Para pedir a exclusão dos seus dados, escreva para contato@impulsodigital063.com ' +
        'informando o estabelecimento e o seu telefone. Confirmamos a sua identidade e ' +
        'concluímos em até 30 dias úteis.',
    },
    { status: 410 },
  )
}
