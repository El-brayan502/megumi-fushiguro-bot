import fetch from 'node-fetch'

let handler = async (m, { conn, args }) => {
  try {
    const text = args[0] || m.text
    const url = text?.match(/https?:\/\/(www\.)?(vt\.)?tiktok\.com\/\S+/i)?.[0]

    if (!url) {
      return conn.reply(
        m.chat,
        '📌 Usa: *.tt <link de TikTok>*',
        m,
        global.rcanal
      )
    }

    await m.react('⏳')

    const api = `https://neji-api.vercel.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`
    const res = await fetch(api)
    const json = await res.json()

    if (!json?.status) throw 'Error API'

    const data = json.result
    const videoUrl = data.cover.play

    const videoRes = await fetch(videoUrl)
    const buffer = Buffer.from(await videoRes.arrayBuffer())

    await conn.sendMessage(
      m.chat,
      {
        text:
`🎵 *TikTok Downloader*

👤 Autor: ${data.author_info.nickname}
⏱ Duración: ${data.cover.duration}s
🎧 Música: ${data.music.title}

⏬ Descargando...`
      },
      { quoted: m }
    )

    await conn.sendMessage(
      m.chat,
      {
        video: buffer,
        mimetype: 'video/mp4',
        caption: data.title || 'TikTok'
      },
      { quoted: m }
    )

    await m.react('✅')

  } catch (e) {
    console.error(e)
    await m.react('❌')
    conn.reply(m.chat, '❌ Error al descargar el TikTok', m, global.rcanal)
  }
}

handler.help = ['tiktok <url>']
handler.tags = ['downloader']
handler.command = ['tiktok', 'tt']

export default handler