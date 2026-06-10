export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const CHATWOOT_URL = "https://modernraven-chatwoot.cloudfy.live";
  const CHATWOOT_TOKEN = "tAvYfGTrTAtwOhIrUDlt4C8szXZqWMUH";
  const ACCOUNT_ID = 1;
  const EVOLUTION_URL = "https://warmbloodedmanatee-evolution.cloudfy.live";
  const EVOLUTION_KEY = "C9CF92963660-4B6B-8376-ADD175AD3BD0";
  const EVOLUTION_INSTANCE = "CENTRAL DE ATENDIMENTO COMERCIAL - ESTER LO,A";
  const MEU_NUMERO = "5521981783125";

  const log = [];

  try {
    const { nome, email, whatsapp, resumo } = req.body;
    log.push(`Dados recebidos: ${nome} / ${email} / ${whatsapp}`);

    // 1. Criar contato
    log.push("Criando contato no Chatwoot...");
    const newContact = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome, email: email, phone_number: whatsapp })
    });
    const contactData = await newContact.json();
    log.push(`Contato status: ${newContact.status} | ID: ${contactData.id} | Erro: ${JSON.stringify(contactData.errors || null)}`);
    
    const contactId = contactData.id;
    if (!contactId) throw new Error(`Falha ao criar contato: ${JSON.stringify(contactData)}`);

    // 2. Criar conversa
    log.push(`Criando conversa com inbox_id=1 e contact_id=${contactId}...`);
    const convRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ inbox_id: 1, contact_id: contactId })
    });
    const convData = await convRes.json();
    log.push(`Conversa status: ${convRes.status} | ID: ${convData.id} | Erro: ${JSON.stringify(convData.errors || null)}`);

    const convId = convData.id;
    if (!convId) throw new Error(`Falha ao criar conversa: ${JSON.stringify(convData)}`);

    // 3. Enviar mensagem
    log.push(`Enviando mensagem na conversa ${convId}...`);
    const msgRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ content: resumo, message_type: "incoming", private: false })
    });
    const msgData = await msgRes.json();
    log.push(`Mensagem status: ${msgRes.status}`);

    // 4. WhatsApp aluno
    const numeroAluno = whatsapp.replace(/\D/g, "").replace(/^0/, "55");
    log.push(`Enviando WhatsApp para aluno: ${numeroAluno}`);
    const wppAluno = await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
      method: "POST",
      headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: numeroAluno,
        text: `Olá, ${nome}! 👋\n\nSeus dados foram recebidos com sucesso pela *Empire Mentis — Consultoria de Educação*. ✅\n\nEm breve nossa equipe entrará em contato para dar andamento ao seu relatório de estágio.\n\nAtenciosamente,\n_Empire Mentis_`
      })
    });
    log.push(`WhatsApp aluno status: ${wppAluno.status}`);

    // 5. WhatsApp Ester
    log.push(`Enviando WhatsApp para Ester: ${MEU_NUMERO}`);
    const wppEster = await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
      method: "POST",
      headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: MEU_NUMERO,
        text: `📋 *Novo Formulário de Estágio!*\n\n*Aluno:* ${nome}\n*WhatsApp:* ${whatsapp}\n*E-mail:* ${email}\n\nAcesse o Chatwoot para ver todas as respostas.\n\n_Empire Mentis_`
      })
    });
    log.push(`WhatsApp Ester status: ${wppEster.status}`);

    console.log("LOG:", log.join(" | "));
    return res.status(200).json({ success: true, log });

  } catch (err) {
    console.error("ERRO:", err.message, "| LOG:", log.join(" | "));
    return res.status(500).json({ error: err.message, log });
  }
}
