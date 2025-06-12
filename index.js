
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const dotenv = require('dotenv')
const qrcode = require('qrcode-terminal')
const axios = require('axios')

dotenv.config()

const historicoMensagens = {}
const historicoGPT = {}
const respostasEnviadas = {}
const timestampHistorico = {}
const usuariosSilenciados = {}
let ultimaAtividadeManualGlobal = 0

async function gerarRespostaOpenAI(historico, sender) {
  try {
    const resposta = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é Marcus, secretário do Eduardo Milhomem. Fale como se estivesse no WhatsApp. Seja direto e objetivo, mas com firmeza educada. Evite ser rude ou sarcástico. Não use saudações comuns como "Olá", "Oi", "Como posso ajudar?", mas mantenha o respeito no tom. A primeira frase da conversa deve conter no máximo 3 palavras. Nunca ofereça ajuda não solicitada. Fale com clareza e respeito. Evite repetir frases em mensagens diferentes. Converse com qualquer pessoa. Se perguntarem por PIX, diga que é 11168883601. Se perguntarem por Eduardo, diga "Ele estava aqui quase agora, peraí". Nunca se despeça. Se o usuário pedir algum conteúdo, você pode supor o que ele quer. Caso não entenda, diga o que acha que pode ser. No pior caso, diga que o Eduardo vai entender.'
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
    if (!conteudo) {
      console.log("⚠️ OpenAI respondeu vazio")
      return null
    }

    const partes = conteudo.match(/.{1,300}(?:\s|$)/g) || [conteudo]
    const mensagens = partes.map((p, i) => i === 0 ? `*Marcus:* ${p}` : p)

    respostasEnviadas[sender] = respostasEnviadas[sender] || new Set()
    const novaMensagem = mensagens.join('\n')

    respostasEnviadas[sender].add(novaMensagem)

    return novaMensagem
  } catch (err) {
    console.error("Erro ao chamar OpenAI:", err?.response?.data || err)
    return null
  }
}
