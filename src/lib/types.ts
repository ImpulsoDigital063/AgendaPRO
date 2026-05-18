export type Business = {
  id: string
  name: string
  description: string | null
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
  brand_primary?: string | null
  brand_secondary?: string | null
  brand_mode?: 'dark' | 'light' | null
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
  points: number
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
