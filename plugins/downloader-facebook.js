import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text)
      return conn.reply(
        m.chat,
        `*☘️ Envíe un enlace de ${usedPrefix + command}, para hacer la descarga*`,
        m,
        rcanal
      )

    await m.react('🕒')

    const api = `https://neji-api.vercel.app/api/downloader/facebook?url=${encodeURIComponent(text)}`
    const res = await fetch(api)
    const json = await res.json()

    if (!json || json.status !== 'success')
      throw 'No se pudo obtener el video.'

    const videoUrl = json.hd || json.sd
    if (!videoUrl)
      throw 'No hay enlaces disponibles.'

    await conn.sendMessage(
      m.chat,
      {
        video: { url: videoUrl },
        caption: `🎥 *FACEBOOK DOWNLOADER*\n\n✅ Calidad: ${json.hd ? 'HD' : 'SD'}\n⚡ Descarga rápida`,
      },
      { quoted: m }
    )

    await m.react('✅')
  } catch (e) {
    await m.react('❌')
    await conn.reply(
      m.chat,
      `⚠️ *Error al descargar*\n\n${e}`,
      m,
      rcanal
    )
  }
}

handler.help = ['facebook <url>']
handler.tags = ['downloader']
handler.command = ['fb', 'facebook', 'fbdl']

export default handler