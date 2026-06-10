export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const CHATWOOT_URL = "https://modernraven-chatwoot.cloudfy.live";
  const CHATWOOT_TOKEN = "tAvYfGTrTAtwOhIrUDlt4C8szXZqWMUH";
  const ACCOUNT_ID = 1;
  const INBOX_ID = 1; // ID fixo da inbox FORMULÁRIO DE ESTÁGIO
  const EVOLUTION_URL = "https://warmbloodedmanatee-evolution.cloudfy.live";
  const EVOLUTION_KEY = "C9CF92963660-4B6B-8376-ADD175AD3BD0";
  const EVOLUTION_INSTANCE = "CENTRAL DE ATENDIMENTO COMERCIAL - ESTER LO,A";
  const MEU_NUMERO = "5521981783125";

  try {
    const { nome, email, whatsapp, resumo } = req.body;

    // 1. Buscar ou criar contato
    let contactId;
    try {
      const searchRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search?q=${encodeURIComponent(email)}&include_contacts=true`, {
        headers: { "api_access_token": CHATWOOT_TOKEN }
      });
      const searchData = await searchRes.json();
      if (searchData.payload && searchData.payload.length > 0) {
        contactId = searchData.payload[0].id;
      }
    } catch(e) {}

    if (!contactId) {
      const newContact = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`, {
        method: "POST",
        headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, email: email, phone_number: whatsapp })
      });
      const newContactData = await newContact.json();
      contactId = newContactData.id;
    }

    // 2. Criar conversa com INBOX_ID fixo
    const convRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        inbox_id: INBOX_ID,
        contact_id: contactId,
        additional_attributes: { initiated_at: { title: "Formulário de Estágio — Empire Mentis" } }
      })
    });
    const convData = await convRes.json();
    const convId = convData.id;

    // 3. Enviar resumo
    await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ content: resumo, message_type: "incoming", private: false })
    });

    // 4. Nota interna
    await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "📋 Novo formulário de estágio recebido. Entrar em contato com o aluno pelo WhatsApp.",
        message_type: "activity",
        private: true
      })
    });

    // 5. WhatsApp para o aluno
    const numeroAluno = whatsapp.replace(/\D/g, "").replace(/^0/, "55");
    if (numeroAluno.length >= 10) {
      await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
        method: "POST",
        headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          number: numeroAluno,
          text: `Olá, ${nome}! 👋\n\nSeus dados foram recebidos com sucesso pela *Empire Mentis — Consultoria de Educação*. ✅\n\nEm breve nossa equipe entrará em contato para dar andamento ao seu relatório de estágio.\n\nAtenciosamente,\n_Empire Mentis_`
        })
      });
    }

    // 6. WhatsApp para Ester
    await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
      method: "POST",
      headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: MEU_NUMERO,
        text: `📋 *Novo Formulário de Estágio!*\n\n*Aluno:* ${nome}\n*WhatsApp:* ${whatsapp}\n*E-mail:* ${email}\n\nAcesse o Chatwoot para ver todas as respostas.\n\n_Empire Mentis_`
      })
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("ERRO:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
