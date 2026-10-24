/* PAINEL DA CLÍNICA · a identidade da vitrine levada pro painel da dona, da
   recepção e das profissionais (Eduardo 23/10: "igual o branding da Palace,
   só que ainda melhor"). Protótipo: lê o mesmo conteudo.ts da vitrine, nada
   no banco. Só a clínica com vitrine ganha; as outras contas seguem iguais.

   Pra mostrar sem entrar na conta real da clínica: subir o dev com
   PAINEL_CLINICA_PREVIEW=<slug de teste> e essa conta veste a identidade da
   Ivna (com os dados dela mesma). Só no dev local. */
import { conteudoDaVitrine } from './conteudo'

const CLINICA_DO_PREVIEW = 'ivna-loyola-beauty-clinic'

export type PainelClinica = {
  logo: string
  monograma: string
  fotos: Record<string, string>
  papeis: Record<string, string>
}

export function painelDaClinica(slug: string | null | undefined): PainelClinica | null {
  if (!slug) return null
  const preview = process.env.NODE_ENV === 'development' && process.env.PAINEL_CLINICA_PREVIEW === slug
  const c = conteudoDaVitrine(preview ? CLINICA_DO_PREVIEW : slug)
  if (!c?.logoDourada || !c.monograma) return null
  return {
    logo: c.logoDourada,
    monograma: c.monograma,
    // no preview as fotos são da equipe da Ivna: não pendura rosto dela em quem é de teste
    fotos: preview ? {} : c.fotos ?? {},
    papeis: preview ? {} : Object.fromEntries(Object.entries(c.bios).flatMap(([n, b]) => (b.papel ? [[n, b.papel]] : []))),
  }
}

/** "Ivna Loyola" → "Ivna" (fotos e papéis são por primeiro nome) */
export function primeiroNomeDe(nome: string | null | undefined) {
  return (nome ?? '').trim().split(/\s+/)[0] ?? ''
}
