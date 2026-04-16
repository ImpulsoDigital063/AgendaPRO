export type Business = {
  id: string
  name: string
  description: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  slug: string
  owner_id: string
  created_at: string
  google_place_id: string | null
  google_rating: number | null
  google_reviews_count: number | null
  points_for_review: number
  points_for_referral: number
  brand_primary?: string | null
  brand_secondary?: string | null
  brand_mode?: 'dark' | 'light' | null
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
  password_changed: boolean
  created_at: string
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
}

export type AppointmentWithDetails = Appointment & {
  professional: Professional
  business: Business
}

export type TimeSlot = {
  time: string      // "14:00"
  available: boolean
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
