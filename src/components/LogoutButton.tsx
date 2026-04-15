'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { IconLogout } from '@/components/ui/Icon'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Sair"
      title="Sair"
      className="relative inline-flex items-center justify-center rounded-full transition-all hover:scale-[1.04] active:scale-95"
      style={{
        width: 36,
        height: 36,
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        color: 'var(--admin-text-2)',
      }}
    >
      <IconLogout size={16} />
    </button>
  )
}
