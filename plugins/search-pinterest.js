import axios from 'axios';
import baileys from '@whiskeysockets/baileys';

async function sendAlbumMessage(conn, jid, medias, options = {}) {
  if (typeof jid !== 'string') throw new TypeError('jid debe ser string');
  if (!Array.isArray(medias) || medias.length < 2) throw new RangeError('Se requieren al menos 2 imágenes');

  const caption = options.caption || '';

  const album = baileys.generateWAMessageFromContent(
    jid,
    {
      messageContextInfo: {},
      albumMessage: {
        expectedImageCount: medias.filter(m => m.type === 'image').length,
        expectedVideoCount: medias.filter(m => m.type === 'video').length,
        ...(options.quoted ? {
          contextInfo: {
            remoteJid: options.quoted.key.remoteJid,
            fromMe: options.quoted.key.fromMe,
            stanzaId: options.quoted.key.id,
            participant: options.quoted.key.participant || options.quoted.key.remoteJid,
            quotedMessage: options.quoted.message
          }
        } : {})
      }
    },
    {}
  );

  await conn.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id });

  await Promise.all(
    medias.map(async (media, i) => {
      const msg = await baileys.generateWAMessage(
        album.key.remoteJid,
        { [media.type]: media.data, ...(i === 0 ? { caption } : {}) },
        { upload: conn.waUploadToServer }
      );
      msg.message.messageContextInfo = {
        messageAssociation: { associationType: 1, parentMessageKey: album.key }
      };
      return conn.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
    })
  );

  return album;
}

const pinterestSearch = async (query) => {
  try {
    const res = await axios.get(
      `https://neji-api.vercel.app/api/search/pinterest?q=${encodeURIComponent(query)}&limit=10`
    );
    if (!res.data.success || !res.data.results) return [];
    return res.data.results.slice(0, 10).map(url => ({
      type: 'image',
      data: { url }
    }));
  } catch {
    return [];
  }
};

let handler = async (m, { conn, text }) => {
  if (!text)
    return conn.reply(m.chat, '*que quieres buscar en Pinterest*', m, rcanal);

  try {
    const medias = await pinterestSearch(text);
    if (!medias.length)
      return conn.reply(m.chat, `No se encontraron imágenes para "${text}".`, m, rcanal);

    await sendAlbumMessage(conn, m.chat, medias, {
      caption: `✅️ Resultados: ${text}`,
      quoted: m
    });

  } catch (e) {
    console.error(e);
    return conn.reply(m.chat, 'Error enviando imágenes.', m, rcanal);
  }
};

handler.help = ['pinterest <texto>'];
handler.tags = ['search'];
handler.command = ['pinterest', 'pin', 'pinsearch'];
handler.register = true;

export default handler;