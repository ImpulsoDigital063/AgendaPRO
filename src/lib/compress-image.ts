import imageCompression from 'browser-image-compression'

export type CompressPreset = 'photo' | 'logo' | 'cover'

type PresetConfig = {
  maxWidthOrHeight: number
  maxSizeMB: number
  fileType?: 'image/webp' | 'image/jpeg'
}

const PRESETS: Record<CompressPreset, PresetConfig> = {
  // Foto de profissional / dono — quadrada, peso baixo, WebP
  photo: { maxWidthOrHeight: 800, maxSizeMB: 0.25, fileType: 'image/webp' },
  // Logo do negócio — pequena, transparência preservada via fallback
  logo: { maxWidthOrHeight: 512, maxSizeMB: 0.15, fileType: 'image/webp' },
  // Capa do negócio — banner mais largo
  cover: { maxWidthOrHeight: 1600, maxSizeMB: 0.4, fileType: 'image/webp' },
}

const HARD_INPUT_LIMIT_MB = 15
const REJECTED_TYPES = ['image/heic', 'image/heif']

export type CompressResult =
  | { ok: true; file: File; originalKB: number; compressedKB: number }
  | { ok: false; reason: string }

export async function compressImage(
  input: File,
  preset: CompressPreset
): Promise<CompressResult> {
  if (!input.type.startsWith('image/')) {
    return { ok: false, reason: 'Envie uma imagem (PNG, JPG ou WEBP).' }
  }
  if (REJECTED_TYPES.includes(input.type.toLowerCase())) {
    return {
      ok: false,
      reason: 'Formato HEIC do iPhone não é suportado. Salve como JPG antes de enviar.',
    }
  }
  if (input.size > HARD_INPUT_LIMIT_MB * 1024 * 1024) {
    return { ok: false, reason: `Imagem muito grande. Máximo ${HARD_INPUT_LIMIT_MB} MB.` }
  }

  const cfg = PRESETS[preset]
  try {
    const compressed = await imageCompression(input, {
      maxWidthOrHeight: cfg.maxWidthOrHeight,
      maxSizeMB: cfg.maxSizeMB,
      fileType: cfg.fileType,
      useWebWorker: true,
      initialQuality: 0.82,
    })
    // imageCompression devolve Blob; garantimos que vira File com extensão coerente
    const ext = (cfg.fileType || compressed.type || 'image/jpeg').split('/')[1] || 'jpg'
    const baseName = input.name.replace(/\.[^.]+$/, '') || 'imagem'
    const file = new File([compressed], `${baseName}.${ext}`, { type: cfg.fileType || compressed.type })
    return {
      ok: true,
      file,
      originalKB: Math.round(input.size / 1024),
      compressedKB: Math.round(file.size / 1024),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'falha ao comprimir'
    return { ok: false, reason: `Não consegui processar a imagem: ${msg}` }
  }
}
