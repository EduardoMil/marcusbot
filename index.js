// index.js atualizado com filtro de mensagens baseado na atividade do Eduardo e gatilhos

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const dotenv = require('dotenv')
const qrcode = require('qrcode')
const axios = require('axios')
const P = require('pino')

dotenv.config()

const historicoMensagens = {}
const respostasEnviadas = {}
const ultimaMensagemDoEduardo = {}

async function gerarRespostaOpenAI(historico, sender) {
  try {
    const resposta = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Fale como Marcus, um assistente direto no WhatsApp. Respostas curtas, informais e práticas.
Nunca se apresente duas vezes. Se pedirem algo com imagem, tente adivinhar o que querem.
Se não tiver certeza, chute com confiança. Use frases curtas e sem enrolação.
Nunca use 'oi' ou 'olá'. A primeira frase deve ter no máximo 3 palavras. Se perguntarem por PIX, diga que é 11168883601. Se perguntarem por Eduardo, diga "Ele tava aqui quase agora, peraí".`
          },
          ...historico
        ],
        temperature: 0.8
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
    if (respostasEnviadas[sender] === conteudo) return null
    respostasEnviadas[sender] = conteudo

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
    const nome = msg.pushName?.toLowerCase() || ''
    const agora = Date.now()

    // Se for o Eduardo, atualiza timestamp
    if (nome.includes("eduardo")) {
      ultimaMensagemDoEduardo[sender] = agora
      return
    }

    // Verifica se teve mensagem do Eduardo nos últimos 5 minutos
    const cincoMin = 5 * 60 * 1000
    const tempoDesdeUltimaMensagem = agora - (ultimaMensagemDoEduardo[sender] || 0)
    if (tempoDesdeUltimaMensagem < cincoMin) return

    // Coleta texto ou legenda
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ''
    if (!texto) return

    // Verifica se há intenção clara (gatilhos)
    const gatilhos = /(troca|faz|envia|cria|edita|mostra|responde|ajuda|arte|design|pix|conteúdo|post)/i
    if (!gatilhos.test(texto)) return

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
