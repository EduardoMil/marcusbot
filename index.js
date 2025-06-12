const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Configuration, OpenAIApi } = require('openai')
const { Boom } = require('@hapi/boom')
const qrcode = require('qrcode-terminal')
const dotenv = require('dotenv')
const axios = require('axios')

dotenv.config()

const openaiApiKey = process.env.OPENAI_KEY

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        iniciarBot()
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text
    if (!texto) return

    try {
      const configuration = new Configuration({
        apiKey: openaiApiKey
      })
      const openai = new OpenAIApi(configuration)

      const resposta = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Você é Marcus, secretário do Eduardo Milhomem. Fale como se estivesse no WhatsApp. Seja direto e objetivo, mas com firmeza educada.'
          },
          {
            role: 'user',
            content: texto
          }
        ]
      })

      const conteudo = resposta.data.choices[0].message.content.trim()
      await sock.sendMessage(msg.key.remoteJid, { text: conteudo }, { quoted: msg })

    } catch (erro) {
      console.log('❌ Erro OpenAI:', erro.response?.data || erro.message)
      await sock.sendMessage(msg.key.remoteJid, { text: 'Erro ao gerar resposta com a IA.' }, { quoted: msg })
    }
  })
}

iniciarBot()
