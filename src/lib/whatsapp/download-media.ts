const GRAPH_API_URL = 'https://graph.facebook.com/v23.0'

interface MediaDownloadResult {
  buffer: Buffer
  mimeType: string
}

/**
 * Baixa mídia (imagem/áudio) do WhatsApp via Meta Graph API.
 * A API exige 2 requests: 1) pega URL pelo media ID, 2) baixa o binário.
 */
export async function downloadWhatsAppMedia(
  mediaId: string
): Promise<MediaDownloadResult | null> {
  const accessToken = process.env.WA_ACCESS_TOKEN

  if (!accessToken) {
    console.error('[WhatsApp Media] Missing WA_ACCESS_TOKEN env var')
    return null
  }

  try {
    const metadataResponse = await fetch(
      `${GRAPH_API_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!metadataResponse.ok) {
      const error = await metadataResponse.json()
      console.error('[WhatsApp Media] Failed to get media URL:', JSON.stringify(error))
      return null
    }

    const metadata = await metadataResponse.json() as { url: string; mime_type: string }
    const mediaUrl = metadata.url
    const mimeType = metadata.mime_type

    if (!mediaUrl) {
      console.error('[WhatsApp Media] No URL in media metadata response')
      return null
    }

    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!mediaResponse.ok) {
      console.error('[WhatsApp Media] Failed to download media binary, status:', mediaResponse.status)
      return null
    }

    const arrayBuffer = await mediaResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return { buffer, mimeType }
  } catch (err) {
    console.error('[WhatsApp Media] Download failed:', err)
    return null
  }
}
