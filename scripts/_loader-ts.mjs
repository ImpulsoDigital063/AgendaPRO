/* Resolve import relativo sem extensao para .ts — que e como o codigo do
   src escreve (`./pacotes`) e como o Next entende, mas o Node nao.
   Usado so por scripts de teste: nao muda nada do projeto. */
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try { return await next(specifier + '.ts', context) } catch { /* segue */ }
  }
  return next(specifier, context)
}
