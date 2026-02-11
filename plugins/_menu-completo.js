import moment from 'moment-timezone'

let handler = async (m, { conn, usedPrefix }) => {
  const who = m.sender
  const taguser = `@${who.split('@')[0]}`
  const botname = global.botname || 'Nagi Bot'

  const zona = 'America/Guatemala'
  const fecha = moment.tz(zona).format('DD/MM/YYYY')
  const hora = moment.tz(zona).format('HH:mm:ss')

  let user = global.db.data.users[who]
  let nombre = await conn.getName(who)
  let premium = user?.premium ? '✅ Sí' : '❌ No'
  let limite = user?.limit ?? 0
  let totalUsers = Object.keys(global.db.data.users).length
  let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length
  let uptime = clockString(process.uptime())

  function clockString(seconds) {
    let h = Math.floor(seconds / 3600)
    let m = Math.floor(seconds % 3600 / 60)
    let s = Math.floor(seconds % 60)
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
  }

  const stylize = s => s.toLowerCase().replace(/[a-z]/g, c => ({
    a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ', g:'ɢ',
    h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ', n:'ɴ',
    o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'ꜱ', t:'ᴛ', u:'ᴜ',
    v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ'
  }[c] || c))

  let plugins = Object.values(global.plugins)
    .filter(p => p.help && p.tags)
    .map(p => ({
      help: Array.isArray(p.help) ? p.help : [p.help],
      tags: Array.isArray(p.tags) ? p.tags : [p.tags]
    }))

  let categorias = [...new Set(plugins.flatMap(p => p.tags))]

  let caption = `
*Hola ${nombre}*

\`${botname}\` sistema automatizado para comandos, descargas y utilidades.

👤 *Usuario* ┆ ${taguser}
🕒 *Hora* ┆ ${hora}
📅 *Fecha* ┆ ${fecha}

🤖 *Bot activo* ┆ ${uptime}
👥 *Usuarios* ┆ ${totalUsers}
👨‍👩‍👧‍👦 *Grupos* ┆ ${groupsCount}
`.trim()

  for (let tag of categorias) {
    let comandos = plugins
      .filter(p => p.tags.includes(tag))
      .flatMap(p => p.help)
      .map(cmd => `│  ◦ ${usedPrefix}${cmd}`)
      .join('\n')

    if (!comandos) continue

    caption += `

*– ᴍᴇɴᴜ ${stylize(tag)}*
${comandos}
└──`
  }

  const file = 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/ca4a01-1770600773657.jpg'

  await conn.sendMessage(m.chat, {
    product: {
      productImage: { url: file },
      productId: '24529689176623820',
      title: botname,
      currencyCode: 'USD',
      priceAmount1000: '0',
      retailerId: 1677,
      productImageCount: 1
    },
    businessOwnerJid: who,
    caption: caption.trim(),
    footer: '© NagiBot · Menu',
    interactiveButtons: [
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: '📢 Canal oficial',
          url: 'https://whatsapp.com/channel/0029Vb6BDQc0lwgsDN1GJ31i'
        })
      }
    ],
    mentions: [who]
  })
}

handler.command = ['menu', 'allmenu', 'help']
export default handler