let handler = async (m, { conn, usedPrefix }) => {
  const who = m.sender
  const taguser = `@${who.split('@')[0]}`
  const botname = global.botname || 'Nagi Bot'

  const file = 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/ca4a01-1770600773657.jpg'

  // ───── estilo de texto ─────
  const stylize = s => s.toLowerCase().replace(/[a-z]/g, c => ({
    a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ꜰ', g:'ɢ',
    h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ', n:'ɴ',
    o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'ꜱ', t:'ᴛ', u:'ᴜ',
    v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ'
  }[c] || c))

  // ───── obtener plugins ─────
  let plugins = Object.values(global.plugins)
    .filter(p => p.help && p.tags)

  let data = plugins.map(p => ({
    help: Array.isArray(p.help) ? p.help : [p.help],
    tags: Array.isArray(p.tags) ? p.tags : [p.tags]
  }))

  // ───── detectar categorías automáticamente ─────
  let categorias = [...new Set(data.flatMap(p => p.tags))]

  // ───── construir texto FINAL directamente ─────
  let caption = `
👤 Usuario: ${taguser}
`.trim()

  for (let tag of categorias) {
    let comandos = data
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

  // ───── enviar product message ─────
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
          display_text: '📢 Canal',
          url: 'https://whatsapp.com/channel/0029Vb6BDQc0lwgsDN1GJ31i'
        })
      }
    ],
    mentions: [who]
  })
}

handler.command = ['menu', 'allmenu', 'help']
export default handler