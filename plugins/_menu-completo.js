let handler = async (m, { conn, usedPrefix }) => {
  const who = m.sender
  const taguser = `@${who.split('@')[0]}`
  const botname = global.botname || 'Nagi Bot'

  // 📷 Imagen fija (NO perfil → no loading)
  const image = 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/ca4a01-1770600773657.jpg'

  // 📦 Obtener comandos reales
  let commands = Object.values(global.plugins)
    .filter(v => v.help && v.tags)
    .map(v => ({
      help: Array.isArray(v.help) ? v.help : [v.help],
      tags: Array.isArray(v.tags) ? v.tags : [v.tags]
    }))

  // 🏷️ Categorías
  let tags = {
    main: 'main-cmd',
    fun: 'fun-cmd',
    nsfw: 'nsfw-cmd',
    search: 'search-cmd',
    games: 'games-cmd',
    Generador: 'generador-cmd'
  }

  // 🎨 Estilo
  let header = '_— %category_'
  let body = ' └• %cmd'
  let after = `> 𝖭𝖺𝗀𝗂𝖻𝗈𝗍 ┆ 𝖠𝗌𝗌𝗂𝗌𝗍𝖺𝗇𝗍`

  // 🧩 Construcción del menú (DINÁMICO)
  let menu = []
  for (let tag in tags) {
    let cmds = commands
      .filter(cmd => cmd.tags.includes(tag))
      .map(cmd => cmd.help.map(h =>
        body.replace('%cmd', usedPrefix + h)
      ).join('\n'))
      .join('\n')

    if (cmds) {
      menu.push(
        header.replace('%category', tags[tag]) +
        '\n' +
        cmds
      )
    }
  }

  // 📄 Texto final
  let finalMenu = `
👤 Usuario: ${taguser}

${menu.join('\n\n')}

${after}
`.trim()

  // 📦 PRODUCT MESSAGE
  const productMessage = {
    product: {
      productImage: { url: image },
      productId: '1',
      title: botname,
      currencyCode: 'USD',
      priceAmount1000: '0',
      retailerId: 'nagi',
      productImageCount: 1
    },
    businessOwnerJid: who,
    caption: finalMenu,
    footer: '© Nagi Bot · Menu',
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
  }

  await conn.sendMessage(m.chat, productMessage)
}

handler.help = ['menu', 'help']
handler.tags = ['main']
handler.command = ['menu', 'help', 'allmenu']
handler.register = true

export default handler