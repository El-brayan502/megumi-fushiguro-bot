import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import moment from 'moment-timezone'

global.botNumber = '' 
global.owner = [
  ['573244278232', 'Neji ssj', true],
  ['50231458537', 'BrayanX330', true],
  ['573229506110','DuarteXV',true]
  ['51941658192','Perro',true]
]
global.mods = []
global.prems = []
global.suittag = ['50231458537']

global.botname = '⭐️ Kryzen-MD'
global.author = 'Brayan330'
global.sticker = 'sticker created by Kryzen-MD'

global.sessions = 'Sessions'
global.jadi = 'JadiBots'
global.moneda = 'dolares'
global.multiplier = 60
global.prefix = /^[./!#?]/

global.channel = 'https://whatsapp.com/channel/0029Vb6BDQc0lwgsDN1GJ31i'
global.md = 'https://github.com/El-brayan502/megumi-fushiguro-bot'
global.ch = { id: '120363417186717632@newsletter' }

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.cyanBright(`✨ [CONFIG] Se han actualizado los ajustes del bot`))
  import(`${file}?update=${Date.now()}`)
})