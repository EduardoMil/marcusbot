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


    const conteudo = resposta.data.choices[0].message.content.trim()
    if (!conteudo) {
      console.log("⚠️ OpenAI respondeu vazio")
      return null

    const partes = conteudo.match(/.{1,300}(?:\s|$)/g) || [conteudo]
    const mensagens = partes.map((p, i) => i === 0 ? `*Marcus:* ${p}` : p)

    respostasEnviadas[sender] = respostasEnviadas[sender] || new Set()
    const novaMensagem = mensagens.join('\n')

    // Resposta repetida detectada — tentar gerar variação ou seguir no contexto
    respostasEnviadas[sender].add(novaMensagem)

    return novaMensagem
  } catch (err) {
    console.error("Erro ao chamar OpenAI:", err?.response?.data || err)
    return null

async function analisarComIA(sock, sender, messageText) {
  const agora = Date.now()
  timestampHistorico[sender] = timestampHistorico[sender] || agora

  if (messageText.trim().toLowerCase() === 'reiniciar') {
    historicoGPT[sender] = []
    respostasEnviadas[sender] = new Set()
    historicoMensagens[sender] = {}
    timestampHistorico[sender] = agora
    usuariosSilenciados[sender] = false
    await sock.sendMessage(sender, { text: '*Marcus:* memória zerada ✅' });
  { text: "*Marcus:* memória zerada ✅"
    return true;
    return true

  if (agora - timestampHistorico[sender] > 1000 * 60 * 60 * 24) {
    historicoGPT[sender] = []
    respostasEnviadas[sender] = new Set()
    timestampHistorico[sender] = agora

  historicoGPT[sender] = historicoGPT[sender] || []

  if (!historicoGPT[sender].consolidado) historicoGPT[sender].consolidado = ''
  historicoGPT[sender].consolidado += ' ' + messageText.trim()
  
  historicoGPT[sender].push({ role: 'user', content: historicoGPT[sender].consolidado.trim() })
  historicoGPT[sender].consolidado = ''

  const respostaGPT = await gerarRespostaOpenAI(historicoGPT[sender], sender)
  if (respostaGPT) {
    historicoGPT[sender].push({ role: 'assistant', content: respostaGPT.replace('*Marcus:* ', '') })
    await sock.sendMessage(sender, {
  { text: respostaGPT
    return true
  return false

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  const sock = makeWASocket({ auth: state })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.clear()
      console.log("📱 Escaneia o QR com o WhatsApp")
      qrcode.generate(qr, { small: true })
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) connectToWhatsApp()
      else console.log("🔌 Desconectado do WhatsApp")
    } else if (connection === 'open') {
      console.log('✅ Conexão aberta com o WhatsApp')

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async (m) => {
    const agora = Date.now()
    const message = m.messages[0]
    if (!message) return

    const sender = message.key.remoteJid
    const texto = message.message?.conversation?.trim().toLowerCase() || ''

    historicoMensagens[sender] = historicoMensagens[sender] || {}

    
    if (usuariosSilenciados[sender]) {
      if (agora - ultimaAtividadeManualGlobal > 1000 * 60 * 60) {
        usuariosSilenciados[sender] = false
      } else {
        return

    // Sistema de silenciamento desativado

    
    if (usuariosSilenciados[sender]) {
      if (agora - ultimaAtividadeManualGlobal > 1000 * 60 * 60) {
        usuariosSilenciados[sender] = false;
      } else {
        return;

    historicoMensagens[sender].ultimaMensagemDoCliente = agora

    const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || ''
    
    if (message.message?.imageMessage && texto.includes('?')) {
      await sock.sendMessage(sender, {
  { text: "*Marcus:* Me avisa o que quiser, tô vendo tudo aqui."
await sock.sendMessage(sender, {
  { text: "*Marcus:* Faço sim. Quer algo nesse estilo? Me fala o tema ou frase que tu quer colocar."
      return;

    if (message.message?.imageMessage && !texto) {
      await sock.sendMessage(sender, {
  { text: "*Marcus:* Me avisa o que quiser, tô vendo tudo aqui."
await sock.sendMessage(sender, {
  { text: "*Marcus:* Tu me manda uma imagem caída no chão e espera o quê? 😐 Fala logo o que tu quer."
      return;

    if (!messageText) return

    if (historicoMensagens[sender].esperandoUsuario) {
      console.log("⏳ Ignorado por trava de tempo (esperandoUsuario)")
      return

    historicoMensagens[sender].esperandoUsuario = true
    setTimeout(() => { historicoMensagens[sender].esperandoUsuario = false }, 2000)

    const foiRespondido = await analisarComIA(sock, sender, messageText)
    if (foiRespondido) {
      historicoMensagens[sender].ultimaMensagemDoMarcus = agora
      return

    await sock.sendMessage(sender, {
  { text: "*Marcus:* Me avisa o que quiser, tô vendo tudo aqui."
await sock.sendMessage(sender, {
  { text: "*Marcus:* Não peguei bem isso. Explica de novo?"
    historicoMensagens[sender].ultimaMensagemDoMarcus = agora

connectToWhatsApp().catch(err => {
  console.error("Erro na inicialização do WhatsApp:", err)

console.log("🤖 Marcus inicializado")

setInterval(() => {}, 1000 * 60 * 60);