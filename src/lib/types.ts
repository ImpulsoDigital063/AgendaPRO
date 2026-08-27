export type Business = {
  id: string
  name: string
  description: string | null
  /** Segmento do negócio (lista fechada em lib/segmento). Decide os exemplos
   *  do painel. Separado da `description`, que é texto livre e público. */
  category?: string | null
  /** v137 · CNPJ ou CPF. Só aparece em documento que sai pra terceiro
   *  (extrato de convênio pro RH da empresa cliente). Nulo não imprime. */
  cnpj?: string | null
  /** v138 · razão social quando difere do nome fantasia, e e-mail de contato.
   *  Mesma regra: só saem em documento que vai pra fora. */
  razao_social?: string | null
  email?: string | null
  /* Chaves por negócio (CAF · 20-21/08/2026). Ver supabase/migrations/v124. */
  agendamento_simultaneo?: boolean | null
  convenios_enabled?: boolean | null
  comissao_valor_fixo?: boolean | null
  /** v131 · % da comissão vem do serviço (Studio Isis Melo) */
  comissao_por_servico?: boolean | null
  prof_registra_pagamento?: boolean | null
  recorrencia_dias_semana?: boolean | null
  phone: string | null
  address: string | null
  logo_url: string | null
  cover_url?: string | null
  slug: string
  owner_id: string
  created_at: string
  google_place_id: string | null
  google_rating: number | null
  google_reviews_count: number | null
  points_for_review: number
  points_for_referral: number
  punctuality_bonus_points?: number
  points_mode?: 'business' | 'professional'
  // Toggle global do programa de fidelidade (v72 · 25/05/2026)
  // Quando false, UI esconde opções de pontos (resgate de recompensa,
  // saldo na comanda, etc). Negócio decide ativar na aba Fidelidade.
  loyalty_enabled?: boolean
  /* v112 · sinal. A pagina publica precisa saber ANTES de a cliente escolher
     horario, pra avisar que vai ter pagamento — descobrir isso so no fim e
     surpresa ruim (Eduardo, 05/08). */
  sinal_enabled?: boolean
  sinal_percent?: number
  /* v113 · usados no aviso de política de cancelamento da página pública.
     Regra ditada pela Wanessa (05/08): cancelou com folga vira crédito com
     validade; em cima da hora, perde. Ver src/lib/sinal-cancelamento.ts */
  sinal_cancel_horas?: number | null
  sinal_credito_dias?: number | null
  brand_primary?: string | null
  brand_secondary?: string | null
  brand_mode?: 'dark' | 'light' | null
  /** Botao de agendar do link publico usa a cor da marca em vez do verde. */
  cta_usa_marca?: boolean | null
  instagram_url?: string | null
  facebook_url?: string | null
  tiktok_url?: string | null
  website_url?: string | null
  whatsapp_intro_message?: string | null
  // Onboarding flags (v41 · 08/05/2026)
  welcome_modal_seen?: boolean | null
  onboarding_horarios_revisado?: boolean | null
  qr_code_compartilhado?: boolean | null
  fidelidade_dica_lida?: boolean | null
  // Autonomia da equipe (v98a/b · 29-30/07/2026 · default false nas três)
  professionals_can_book_self?: boolean | null
  professionals_can_book_others?: boolean | null
  professionals_see_team_agenda?: boolean | null
  // Janela do link público (v100 · 30/07/2026 · pedido do DN Diogo Nogueira)
  // Quantos dias COM ATENDIMENTO o cliente enxerga no passo "Escolha o dia".
  // NULL = comportamento histórico (varre 14 dias corridos e descarta os sem
  // working_hours — num seg-sex isso dá 10 cards). Preenchido = varre até
  // juntar N dias atendíveis, limitado por BOOKING_SCAN_CAP_DAYS.
  // Fica NULL em todo mundo; só quem pedir recebe valor.
  booking_days_with_service?: number | null
  // Punição por no-show (v45 · 14/05/2026)
  no_show_punishment_enabled?: boolean | null
  no_show_penalty_mode?: 'proportional' | 'fixed' | null
  no_show_fixed_points?: number | null
}

export type Professional = {
  id: string
  business_id: string
  name: string
  photo_url: string | null
  active: boolean
  commission_percentage: number
  email: string | null
  auth_user_id: string | null
  role: 'owner' | 'professional'
  employment_type?: 'commissioned' | 'employed'
  is_receptionist?: boolean
  password_changed: boolean
  created_at: string
  // v79 · cargos múltiplos (não exclusivos · Luana é owner+manager)
  is_owner?: boolean
  is_manager?: boolean
  is_professional?: boolean
  is_attendant?: boolean
  // v79 · atribuições (independentes do cargo)
  does_appointments?: boolean
  sells_products?: boolean
  sells_packages?: boolean
  // v79 · dados pessoais
  nickname?: string | null
  birth_date?: string | null
  cpf?: string | null
  rg?: string | null
  rg_orgao?: string | null
  extra_info?: string | null
  instagram?: string | null
  // v79 · dados bancários
  bank_pix_key?: string | null
  bank_name?: string | null
  bank_agency?: string | null
  bank_account?: string | null
  bank_digit?: string | null
  bank_account_type?: string | null
  bank_person_type?: string | null
  bank_holder_name?: string | null
  // v79 · endereço
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_cep?: string | null
}

// Maquininhas e taxas (v49)
export type MerchantDevice = {
  id: string
  business_id: string
  name: string
  active: boolean
  created_at: string
}

export type CardType = 'credit' | 'debit'

export const CARD_BRANDS = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'outros'] as const
export type CardBrand = (typeof CARD_BRANDS)[number]

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'Amex',
  hipercard: 'Hipercard',
  outros: 'Outros',
}

export type MerchantDeviceFee = {
  id: string
  device_id: string
  brand: CardBrand
  card_type: CardType
  rate_percent: number
  active: boolean
  created_at: string
  // v52 · parcelado
  allows_installments?: boolean
  installments_max?: number
  installment_rate_percent?: number | null
}

export type Client = {
  id: string
  name: string
  phone: string
  email: string | null
  created_at: string
}

export type Service = {
  id: string
  business_id: string
  name: string
  description: string | null
  price: number | null
  duration_minutes: number
  active: boolean
  /** v107 · false = serviço interno: o dono usa ao marcar, a cliente não vê
   *  na página pública nem consegue agendar. Diferente de `active`, que
   *  define se o serviço pode ser usado. Opcional porque linhas carregadas
   *  antes da migration não trazem o campo. */
  public_visible?: boolean
  /* CAF · 21/08/2026 · só usados com as chaves do negócio ligadas. */
  commission_amount?: number | null
  /** v134 · % da profissional NESTE serviço · null = usa a do cadastro dela */
  commission_percent?: number | null
  convenio_price?: number | null
  convenio_commission_amount?: number | null
  points: number
  /** v123 · dias até o cliente poder REPETIR este serviço. Passado o prazo,
   *  ele recebe o aviso automático de retorno. null/ausente = sem aviso.
   *  Nasceu de intervalo clínico (toxina 4 meses, peeling 21 dias), mas vale
   *  igual pra corte de cabelo e retoque de cílios. */
  retorno_dias?: number | null
}

export type Customer = {
  id: string
  business_id: string
  name: string
  phone: string
  email: string | null
  total_points: number
  referral_code: string
  referred_by: string | null
  created_at: string
  // Import + fichas (v42 · 14/05/2026) — opcionais até migration rodar
  birthday?: string | null
  notes?: string | null
  import_source?: 'salao365' | 'trinks' | 'booksy' | 'csv-manual' | null
  import_external_id?: string | null
  imported_at?: string | null
}

export type Reward = {
  id: string
  business_id: string
  name: string
  description: string | null
  points_required: number
  active: boolean
  created_at: string
}

export type PointsTransaction = {
  id: string
  customer_id: string
  business_id: string
  professional_id: string | null
  points: number
  reason: 'service' | 'referral' | 'review' | 'redeem'
  appointment_id: string | null
  created_at: string
}

export type WaitlistEntry = {
  id: string
  business_id: string
  professional_id: string
  appointment_date: string
  start_time: string
  client_name: string
  client_phone: string
  client_email: string | null
  notified_at: string | null
  created_at: string
}

export type AppointmentService = {
  id: string
  appointment_id: string
  service_id: string | null
  service_name: string
  price: number | null
  duration_minutes: number
}

export type WorkingHours = {
  id: string
  professional_id: string
  day_of_week: number // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  start_time: string  // "09:00"
  end_time: string    // "18:00"
  slot_duration: number // minutos por atendimento
  /** Auditoria: quem editou pela última vez (admin ou profissional) */
  updated_by_name?: string | null
  /** Timestamp da última criação/atualização */
  updated_at?: string | null
}

export type Appointment = {
  id: string
  business_id: string
  professional_id: string
  client_id: string | null
  client_name: string
  client_phone: string
  client_email: string | null
  service_id: string | null
  service_name: string | null
  total_price: number | null
  appointment_date: string // "2026-04-10"
  start_time: string       // "14:00"
  end_time: string         // "14:30"
  status: 'pending' | 'confirmed' | 'cancelled'
  notes: string | null
  reminded_1d: boolean
  reminded_1h: boolean
  created_at: string
  // FK pra customers (v42 · 14/05/2026) — paralelo ao client_id legado da v2
  customer_id?: string | null
}

export type AppointmentWithDetails = Appointment & {
  professional: Professional
  business: Business
}

export type TimeSlot = {
  time: string      // "14:00"
  available: boolean
}

export type ExpenseCategory =
  | 'rent'
  | 'products'
  | 'salary'
  | 'utilities'
  | 'marketing'
  | 'taxes'
  | 'other'

export type Expense = {
  id: string
  business_id: string
  name: string
  amount: number
  category: ExpenseCategory
  occurred_at: string
  recurring: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // v104 · conta a pagar (sugestão da Letícia · Viva Cacheada · 03/08/2026)
  // 'paid'      → já saiu do caixa. occurred_at = data real do pagamento.
  // 'scheduled' → ainda não saiu. due_date = vencimento (obrigatório no banco).
  // Só o que está 'paid' entra no fluxo de caixa realizado.
  status?: 'paid' | 'scheduled'
  due_date?: string | null
}

export type Coupon = {
  id: string
  business_id: string
  customer_id: string | null
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  expires_at: string
  used_at: string | null
  used_appointment_id: string | null
  campaign_id: string | null
  whatsapp_message: string | null
  sent_at: string | null
  created_at: string
}

export type ActivityLog = {
  id: string
  business_id: string
  professional_id: string | null
  action: 'confirm' | 'cancel' | 'reschedule' | 'login'
  target_type: string | null
  target_id: string | null
  description: string | null
  created_at: string
  professional?: Professional
}
