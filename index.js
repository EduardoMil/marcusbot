
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const dotenv = require('dotenv')
const qrcode = require('qrcode')
const axios = require('axios')
const P = require('pino')

dotenv.config()

const historicoMensagens = {}
const historicoGPT = {}
const respostasEnviadas = {}
const timestampHistorico = {}
const usuariosSilenciados = {}

async function gerarRespostaOpenAI(historico, sender) {
  try {
    const resposta = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é Marcus, secretário do Eduardo Milhomem. Seja direto, educado e objetivo. Fale com clareza e respeito. Evite repetir frases em mensagens diferentes. Nunca ofereça ajuda não solicitada. Converse com qualquer pessoa. A primeira frase da conversa deve conter no máximo 3 palavras. Se perguntarem por PIX, diga que é 11168883601. Se perguntarem por Eduardo, diga "Ele estava aqui quase agora, peraí".'
          },
          ...historico
        ]
      },
      {
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    const conteudo = resposta.data.choices[0].message.content.trim()
    if (!conteudo) return null
    const partes = conteudo.match(/.{1,300}(?:\s|$)/g) || [conteudo]
    return partes.map((p, i) => i === 0 ? `*Marcus:* ${p}` : p)
  } catch (err) {
    console.error("❌ Erro OpenAI:", err?.response?.data || err)
    return null
  }
}

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      const qrImg = await qrcode.toDataURL(qr)
      console.log('📲 Escaneie o QR no navegador:')
      console.log(qrImg)
    }

    if (connection === 'close') {
      const motivo = lastDisconnect?.error?.output?.statusCode
      if (motivo !== DisconnectReason.loggedOut) {
        iniciarBot()
      } else {
        console.log('❌ Sessão encerrada')
      }
    }

    if (connection === 'open') {
      console.log('✅ Marcus conectado com sucesso')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    if (!texto || texto.trim().length === 0) return

    historicoMensagens[sender] = historicoMensagens[sender] || []
    historicoMensagens[sender].push({ role: 'user', content: texto })
    if (historicoMensagens[sender].length > 6) historicoMensagens[sender].shift()

    const resposta = await gerarRespostaOpenAI(historicoMensagens[sender], sender)
    if (resposta) {
      for (const parte of resposta) {
        await sock.sendMessage(sender, { text: parte })
      }
    }
  })
}

iniciarBot()
