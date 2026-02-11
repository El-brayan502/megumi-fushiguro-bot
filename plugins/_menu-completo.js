import moment from 'moment-timezone'

let handler = async (m, { conn, usedPrefix }) => {
  const who = m.sender
  const taguser = `@${who.split('@')[0]}`
  const botname = global.botname || 'Nagi Bot'

  const zona = 'America/Guatemala'
  const fecha = moment.tz(zona).format('DD/MM/YYYY')
  const hora = moment.tz(zona).format('HH:mm:ss')

  let user = global.db.data.users[who] || {}
  let nombre = await conn.getName(who)
  let limite = user.limit ?? 0
  let totalUsers = Object.keys(global.db.data.users).length
  let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length
  let uptime = clockString(process.uptime())

  function clockString(seconds) {
    let h = Math.floor(seconds / 3600)
    let m = Math.floor(seconds % 3600 / 60)
    let s = Math.floor(seconds % 60)
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
  }

  const stylize = s => s.toUpperCase().replace(/[A-Z]/g, c => ({
    A:'𝐀', B:'𝐁', C:'𝐂', D:'𝐃', E:'𝐄', F:'𝐅', G:'𝐆',
    H:'𝐇', I:'𝐈', J:'𝐉', K:'𝐊', L:'𝐋', M:'𝐌', N:'𝐍',
    O:'𝐎', P:'𝐏', Q:'𝐐', R:'𝐑', S:'𝐒', T:'𝐓', U:'𝐔',
    V:'𝐕', W:'𝐖', X:'𝐗', Y:'𝐘', Z:'𝐙'
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

\`${botname}\` sistema automatizado para comandos y utilidades.

*Usuario* ┆ ${taguser}
*Hora* ┆ ${hora}
*Fecha* ┆ ${fecha}

*Bot activo* ┆ ${uptime}
*Usuarios* ┆ ${totalUsers}
*Grupos* ┆ ${groupsCount}
`.trim()

  for (let tag of categorias) {
    let comandos = plugins
      .filter(p => p.tags.includes(tag))
      .flatMap(p => p.help)
      .map(cmd => `> ・ ${usedPrefix}${cmd}`)
      .join('\n')

    if (!comandos) continue

    caption += `

> 〢${stylize(tag)} ✿︎

${comandos}`
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
    footer: '© megumi · Menu',
    interactiveButtons: [
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: 'tap here',
          url: 'https://whatsapp.com/channel/0029Vb6BDQc0lwgsDN1GJ31i'
        })
      }
    ],
    mentions: [who]
  })
}

handler.command = ['menu', 'allmenu', 'help']
export default handler