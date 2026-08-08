/* Configura a conta da Dra Elaine Rebolo — Serenity Clínica Integrada.
   Marca (logo, cores, foto), dados do negócio. Lê de volta pra provar. */
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); let v = l.slice(i + 1).trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1); return [l.slice(0, i).trim(), v] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const SLUG = 'serenityclinicaintegrada'
const DL = 'C:/Users/Usuario/Downloads'
const LOGO_SERENITY = `${DL}/WhatsApp Image 2026-08-07 at 22.07.41 (1).jpeg`
const FOTO = `${DL}/WhatsApp Image 2026-08-08 at 07.47.47.jpeg`

/* Medidas tiradas dos próprios arquivos dela, não escolhidas por gosto:
   fundo e tipografia da logo. */
const OLIVA_ESCURO = '#6B6C55'   // fundo da logo Serenity
const OLIVA_CLARO = '#919480'    // fundo da logo Elaine Rebolo
const OFF_WHITE = '#EEE3DC'      // tipografia das duas

const { data: b } = await db.from('businesses').select('id, name').eq('slug', SLUG).single()
console.log('negócio:', b.name, b.id)

// ── LOGO ────────────────────────────────────────────────────────
/* A logo dela é retrato (852x1280) com muito respiro. No painel ela aparece
   pequena e redonda — sem recortar, vira um borrão com uma borboleta no meio.
   Recorto a marca e completo pra quadrado com o próprio oliva dela. */
const logoQuadrada = await sharp(LOGO_SERENITY)
  .extract({ left: 0, top: 300, width: 852, height: 640 })
  .resize(852, 852, { fit: 'contain', background: OLIVA_ESCURO })
  .resize(512, 512)
  .png()
  .toBuffer()

const upLogo = await db.storage.from('business-covers')
  .upload(`${b.id}/logo-serenity.png`, logoQuadrada, { contentType: 'image/png', upsert: true })
if (upLogo.error) console.error('logo:', upLogo.error.message)
const logoUrl = db.storage.from('business-covers').getPublicUrl(`${b.id}/logo-serenity.png`).data.publicUrl
console.log('logo:', logoUrl)

// ── FOTO DELA ───────────────────────────────────────────────────
/* Vai no PROFISSIONAL, não no negócio: é a foto de quem atende, e é assim que
   ela aparece na grade e na escolha de profissional do link público. */
const foto = await sharp(FOTO).resize(800, 800, { fit: 'cover', position: 'top' }).jpeg({ quality: 88 }).toBuffer()
const { data: prof } = await db.from('professionals').select('id, name').eq('business_id', b.id).limit(1).single()
const upFoto = await db.storage.from('professional-photos')
  .upload(`${prof.id}/perfil.jpg`, foto, { contentType: 'image/jpeg', upsert: true })
if (upFoto.error) console.error('foto:', upFoto.error.message)
const fotoUrl = db.storage.from('professional-photos').getPublicUrl(`${prof.id}/perfil.jpg`).data.publicUrl
await db.from('professionals').update({ photo_url: fotoUrl }).eq('id', prof.id)
console.log('foto de', prof.name + ':', fotoUrl)

// ── CAPA DO LINK PÚBLICO ────────────────────────────────────────
const capa = await sharp(FOTO).resize(1200, 630, { fit: 'cover', position: 'top' }).jpeg({ quality: 85 }).toBuffer()
await db.storage.from('business-covers').upload(`${b.id}/capa.jpg`, capa, { contentType: 'image/jpeg', upsert: true })
const capaUrl = db.storage.from('business-covers').getPublicUrl(`${b.id}/capa.jpg`).data.publicUrl

// ── DADOS E CORES ───────────────────────────────────────────────
const { error } = await db.from('businesses').update({
  name: 'Serenity Clínica Integrada',
  description: 'Estética, Saúde & Bem-estar',
  address: 'Av. Desembargador Munhoz de Melo, 156',
  brand_logo_url: logoUrl,
  logo_url: logoUrl,
  cover_url: capaUrl,
  brand_primary: OLIVA_ESCURO,
  brand_secondary: OLIVA_CLARO,
  brand_accent: OFF_WHITE,
  brand_neutral: OFF_WHITE,
  /* dark porque a identidade dela É escura: oliva profundo com tipografia
     off-white. Página clara com marca escura joga fora metade da marca. */
  brand_mode: 'dark',
}).eq('id', b.id)
if (error) { console.error('update:', error.message); process.exit(1) }

// ── PROVA ───────────────────────────────────────────────────────
const { data: fim } = await db.from('businesses')
  .select('name, description, address, brand_primary, brand_secondary, brand_accent, brand_mode, brand_logo_url, cover_url, phone')
  .eq('id', b.id).single()
console.log('\n── COMO FICOU NO BANCO ──')
for (const [k, v] of Object.entries(fim)) console.log('  ', k + ':', String(v ?? '(vazio)').slice(0, 78))
const { data: p2 } = await db.from('professionals').select('name, photo_url').eq('id', prof.id).single()
console.log('   profissional:', p2.name, '· foto:', p2.photo_url ? 'ok' : 'FALTOU')
