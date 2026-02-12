
import axios from 'axios'
import crypto from 'crypto'

async function savetube(url, format = '720') {
  if (!/^https?:\/\//i.test(url)) throw 'URL tidak valid'

  const id =
    /youtu\.be\/([a-zA-Z0-9_-]{11})/.exec(url)?.[1] ||
    /v=([a-zA-Z0-9_-]{11})/.exec(url)?.[1] ||
    /\/shorts\/([a-zA-Z0-9_-]{11})/.exec(url)?.[1]

  if (!id) throw 'Gagal mengambil ID YouTube'

  const api = axios.create({
    headers: {
      'content-type': 'application/json',
      origin: 'https://yt.savetube.me',
      'user-agent':
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
    }
  })

  const { data: cdnRes } = await api.get(
    'https://media.savetube.vip/api/random-cdn'
  )
  const cdn = cdnRes.cdn

  const { data: infoRes } = await api.post(`https://${cdn}/v2/info`, {
    url: `https://www.youtube.com/watch?v=${id}`
  })

  const encrypted = Buffer.from(infoRes.data, 'base64')
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex'),
    encrypted.slice(0, 16)
  )

  const decrypted = JSON.parse(
    Buffer.concat([
      decipher.update(encrypted.slice(16)),
      decipher.final()
    ]).toString()
  )

  const { data: dlRes } = await api.post(`https://${cdn}/download`, {
    id,
    downloadType: format === 'mp3' ? 'audio' : 'video',
    quality: format === 'mp3' ? '128' : format,
    key: decrypted.key
  })

  return {
    title: decrypted.title,
    duration: decrypted.duration,
    thumbnail:
      decrypted.thumbnail ||
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    type: format === 'mp3' ? 'audio' : 'video',
    quality: format === 'mp3' ? '128' : format,
    download: dlRes.data.downloadUrl
  }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0])
    return m.reply(
      `Gunakan:\n${usedPrefix + command} <url>\n\nContoh:\n${usedPrefix +
        command} https://youtu.be/xxxx`
    )

  const isMp3 = command === 'ytmp3'
  const format = isMp3 ? 'mp3' : '720'

  await m.reply('⏳ Sedang memproses...')

  try {
    const res = await savetube(args[0], format)

    const caption = `🎬 *${res.title}*
⏱️ Durasi : ${Math.floor(res.duration / 60)}:${String(
      res.duration % 60
    ).padStart(2, '0')}
📦 Type : ${res.type}
🎞️ Quality : ${res.quality}`

    if (res.type === 'audio') {
      // MP3 AMAN
      await conn.sendMessage(
        m.chat,
        {
          audio: { url: res.download },
          mimetype: 'audio/mpeg',
          caption
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        {
          document: { url: res.download },
          mimetype: 'video/mp4',
          fileName: `${res.title}.mp4`,
          caption
        },
        { quoted: m }
      )
    }
  } catch (e) {
    console.error(e)
    m.reply('❌ Gagal mengunduh media')
  }
}

handler.help = ['ytmp3 <url>', 'ytmp4 <url>']
handler.tags = ['downloader']
handler.command = /^ytmp3|ytmp4$/i

export default handler