'use client'

/* Produtos → Vender abre o MESMO PDV do "Registrar venda" (Eduardo 28/09:
   uma tela só pra manter), já na aba Produtos. Fechar volta pra Produtos. */

import { useRouter } from 'next/navigation'
import PdvModal from './PdvModal'

export default function PdvPagina({
  businessId,
  prefillProdutoId,
  voltarPara,
}: {
  businessId: string
  prefillProdutoId: string | null
  voltarPara: string
}) {
  const router = useRouter()
  return (
    <PdvModal
      open
      businessId={businessId}
      abaInicial="produtos"
      prefillProdutoId={prefillProdutoId}
      onClose={() => router.push(voltarPara)}
    />
  )
}
