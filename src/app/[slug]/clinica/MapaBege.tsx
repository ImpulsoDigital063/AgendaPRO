'use client'

/* MAPA NA COR DA CLÍNICA (26/10/2026, referência: Clínica Marisa Vaz).
   OpenFreeMap (grátis, sem chave, uso comercial liberado) + MapLibre, com as
   camadas do estilo "positron" repintadas em creme/bege e o pino dourado.
   Parado (sem arrastar): no celular o dedo rola a página em vez de mexer no
   mapa. Este arquivo só baixa quando a seção chega perto da tela (ver Vitrine). */
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const ESTILO = 'https://tiles.openfreemap.org/styles/positron'

const FUNDO = '#F3EDE3'
const AGUA = '#E2D9C8'
const VERDE = '#EBE4D3'
const QUADRA = '#EFE8DC'
const PREDIO = '#E7DDCB'
const RUA = '#FFFFFF'
const BORDA_RUA = '#E3D8C6'
const LETRA = '#8F8473'

function pintar(m: maplibregl.Map) {
  for (const l of m.getStyle().layers ?? []) {
    const id = l.id
    const pinta = (prop: string, valor: unknown) => {
      try { m.setPaintProperty(id, prop, valor) } catch {}
    }
    if (l.type === 'background') pinta('background-color', FUNDO)
    else if (l.type === 'fill') {
      if (/water/.test(id)) pinta('fill-color', AGUA)
      else if (/park|wood|landcover/.test(id)) pinta('fill-color', VERDE)
      else if (/building/.test(id)) { pinta('fill-color', PREDIO); pinta('fill-outline-color', BORDA_RUA) }
      else pinta('fill-color', QUADRA)
    } else if (l.type === 'line') {
      if (/water/.test(id)) pinta('line-color', AGUA)
      else if (/casing/.test(id)) pinta('line-color', BORDA_RUA)
      else if (/highway|road|tunnel|aeroway/.test(id)) pinta('line-color', RUA)
      else if (/rail/.test(id)) pinta('line-color', BORDA_RUA)
      else if (/boundary/.test(id)) m.setLayoutProperty(id, 'visibility', 'none')
    } else if (l.type === 'symbol') {
      if (/shield|airport/.test(id)) m.setLayoutProperty(id, 'visibility', 'none')
      else { pinta('text-color', LETRA); pinta('text-halo-color', FUNDO) }
    }
  }
}

export default function MapaBege({ lat, lng, cor, zoom = 15.6 }: { lat: number; lng: number; cor: string; zoom?: number }) {
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!caixa.current) return
    const m = new maplibregl.Map({
      container: caixa.current,
      style: ESTILO,
      center: [lng, lat],
      zoom,
      interactive: false,
      attributionControl: false,
    })
    // créditos em cima: embaixo fica o cartão com o nome da clínica
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right')
    m.on('style.load', () => pintar(m))

    const pino = document.createElement('div')
    pino.setAttribute('aria-hidden', 'true')
    pino.innerHTML = `
      <span style="position:absolute;inset:-14px;border-radius:9999px;background:${cor};opacity:.18;animation:mapa-pulso 2.4s ease-out infinite"></span>
      <span style="position:relative;display:flex;height:40px;width:40px;align-items:center;justify-content:center;border-radius:9999px;background:${cor};box-shadow:0 10px 24px -8px rgba(42,37,32,.55);border:3px solid #fff">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>
      </span>`
    new maplibregl.Marker({ element: pino }).setLngLat([lng, lat]).addTo(m)

    return () => m.remove()
  }, [lat, lng, cor, zoom])

  return (
    <>
      <style>{'@keyframes mapa-pulso{0%{transform:scale(.6);opacity:.35}100%{transform:scale(1.9);opacity:0}}.maplibregl-ctrl-attrib{font-size:10px;background:rgba(250,247,242,.85)!important}'}</style>
      {/* o MapLibre põe position:relative na caixa dele; por isso ela fica dentro de uma absoluta */}
      <div className="absolute inset-0">
        <div ref={caixa} className="h-full w-full" />
      </div>
    </>
  )
}
