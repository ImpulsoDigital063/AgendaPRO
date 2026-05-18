/**
 * Helper client-side pra registrar ações no activity_log.
 * Fire-and-forget · não bloqueia UI se falhar. Cobre uso pela recepcionista
 * (que opera via supabase client direto) — admin já loga via API server.
 */

import { createClient } from './supabase/client'

export type ActivityAction =
  | 'create_appointment'
  | 'update_appointment'
  | 'confirm_appointment'
  | 'cancel_appointment'
  | 'complete_appointment'
  | 'mark_no_show'
  | 'register_payment'
  | 'create_customer'
  | 'update_customer'
  | 'redeem_points'
  | 'close_cash'
  | 'login'

export async function logActivity(params: {
  business_id: string
  professional_id?: string | null
  action: ActivityAction
  target_type?: string
  target_id?: string | null
  description: string
}) {
  try {
    const sb = createClient()
    await sb.from('activity_log').insert({
      business_id: params.business_id,
      professional_id: params.professional_id ?? null,
      action: params.action,
      target_type: params.target_type ?? null,
      target_id: params.target_id ?? null,
      description: params.description,
    })
  } catch {
    // silencioso · activity_log é nice-to-have, não bloqueia a operação
  }
}
