export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import fs from "fs";
import fetch from "node-fetch";
import FormData from "form-data";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const CHATWOOT_URL = "https://modernraven-chatwoot.cloudfy.live";
  const CHATWOOT_TOKEN = "k5zEFWS7VFAQrxxbzEvvN1rY";
  const ACCOUNT_ID = 1;
  const INBOX_ID = 4;
  const EVOLUTION_URL = "https://warmbloodedmanatee-evolution.cloudfy.live";
  const EVOLUTION_KEY = "C9CF92963660-4B6B-8376-ADD175AD3BD0";
  const EVOLUTION_INSTANCE = "CENTRAL DE ATENDIMENTO COMERCIAL - ESTER LO,A";
  const MEU_NUMERO = "5521981783125";

  const log = [];

  try {
    const { nome, email, whatsapp, resumo, arquivos } = req.body;
    log.push(`Dados: ${nome} / ${email}`);

    // 1. Criar contato
    const contactRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome, email: `${Date.now()}_${email}` })
    });
    const contactData = await contactRes.json();
    const contactId = contactData.id || contactData?.payload?.contact?.id;
    if (!contactId) throw new Error(`Contact ID nulo`);
    log.push(`Contact ID: ${contactId}`);

    // 2. Criar conversa
    const convRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ inbox_id: INBOX_ID, contact_id: contactId })
    });
    const convData = await convRes.json();
    const convId = convData.id;
    if (!convId) throw new Error(`Conv ID nulo`);
    log.push(`Conv ID: ${convId}`);

    // 3. Enviar resumo como mensagem
    await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ content: `📋 *${nome}* | ${email} | ${whatsapp}\n\n${resumo}`, message_type: "incoming", private: false })
    });
    log.push(`Mensagem de texto enviada`);

    // 4. Enviar anexos se existirem (base64)
    if (arquivos && arquivos.length > 0) {
      for (const arq of arquivos) {
        try {
          const buffer = Buffer.from(arq.data, "base64");
          const formData = new FormData();
          formData.append("content", `📎 Anexo: ${arq.nome}`);
          formData.append("message_type", "incoming");
          formData.append("attachments[]", buffer, { filename: arq.nome, contentType: arq.tipo || "application/octet-stream" });

          const anexoRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${convId}/messages`, {
            method: "POST",
            headers: { "api_access_token": CHATWOOT_TOKEN, ...formData.getHeaders() },
            body: formData
          });
          log.push(`Anexo ${arq.nome}: ${anexoRes.status}`);
        } catch(e) {
          log.push(`Erro anexo ${arq.nome}: ${e.message}`);
        }
      }
    }

    // 5. WhatsApp aluno
    let numeroAluno = whatsapp.replace(/\D/g, "");
    if (!numeroAluno.startsWith("55")) numeroAluno = "55" + numeroAluno;
    if (numeroAluno.length >= 12) {
      const wppA = await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
        method: "POST",
        headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          number: numeroAluno,
          text: `Olá, ${nome}! 👋\n\nSeus dados foram recebidos com sucesso pela *Empire Mentis — Consultoria de Educação*. ✅\n\nEm breve nossa equipe entrará em contato para dar andamento ao seu relatório de estágio.\n\nAtenciosamente,\n_Empire Mentis_`
        })
      });
      log.push(`WhatsApp aluno: ${wppA.status}`);
    }

    // 6. WhatsApp Ester
    const wppE = await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
      method: "POST",
      headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: MEU_NUMERO,
        text: `📋 *Novo Formulário de Estágio!*\n\n*Aluno:* ${nome}\n*WhatsApp:* ${whatsapp}\n*E-mail:* ${email}\n*Anexos:* ${arquivos ? arquivos.length : 0} arquivo(s)\n\nAcesse o Chatwoot para ver tudo.\n\n_Empire Mentis_`
      })
    });
    log.push(`WhatsApp Ester: ${wppE.status}`);

    console.log("SUCESSO:", log.join(" | "));
    return res.status(200).json({ success: true, log });

  } catch (err) {
    console.error("ERRO:", err.message, "| LOG:", log.join(" | "));
    return res.status(500).json({ error: err.message, log });
  }
}
