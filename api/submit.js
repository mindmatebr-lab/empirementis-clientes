export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const CHATWOOT_URL = "https://modernraven-chatwoot.cloudfy.live";
  const CHATWOOT_TOKEN = "k5zEFWS7VFAQrxxbzEvvN1rY";
  const ACCOUNT_ID = 1;
  const EVOLUTION_URL = "https://warmbloodedmanatee-evolution.cloudfy.live";
  const EVOLUTION_KEY = "C9CF92963660-4B6B-8376-ADD175AD3BD0";
  const EVOLUTION_INSTANCE = "CENTRAL DE ATENDIMENTO COMERCIAL - ESTER LO,A";
  const MEU_NUMERO = "5521981783125";

  const log = [];

  try {
    const { nome, email, whatsapp, resumo } = req.body;
    log.push(`Dados: ${nome} / ${email}`);

    const telefone = "+" + whatsapp.replace(/\D/g, "").replace(/^0/, "55");

    // 1. Buscar contato existente primeiro
    let contactId;
    const searchRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search?q=${encodeURIComponent(email)}&include_contacts=true`, {
      headers: { "api_access_token": CHATWOOT_TOKEN }
    });
    const searchData = await searchRes.json();
    log.push(`Busca contato status: ${searchRes.status}`);

    if (searchData.payload && searchData.payload.length > 0) {
      contactId = searchData.payload[0].id;
      log.push(`Contato existente ID: ${contactId}`);
    } else {
      // Criar contato novo sem telefone para evitar erro de formato
      const newContact = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`, {
        method: "POST",
        headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, email: email })
      });
      const newContactData = await newContact.json();
      log.push(`Criar contato status: ${newContact.status} | Resposta: ${JSON.stringify(newContactData).slice(0,200)}`);
      
      // O ID pode vir em lugares diferentes dependendo da versão do Chatwoot
      contactId = newContactData.id || newContactData?.payload?.contact?.id;
      log.push(`Contact ID: ${contactId}`);
    }

    if (!contactId) throw new Error(`Contact ID não encontrado`);

    // 2. Criar conversa
    const convRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ inbox_id: 1, contact_id: contactId })
    });
    const convData = await convRes.json();
    const convId = convData.id;
    log.push(`Conversa status: ${convRes.status} | ID: ${convId}`);

    if (!convId) throw new Error(`Conv ID não encontrado: ${JSON.stringify(convData).slice(0,200)}`);

    // 3. Enviar mensagem
    await fetch(`${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ content: resumo, message_type: "incoming", private: false })
    });
    log.push(`Mensagem enviada`);

    // 4. WhatsApp aluno
    const numeroAluno = whatsapp.replace(/\D/g, "").replace(/^0/, "55");
    if (numeroAluno.length >= 10) {
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

    // 5. WhatsApp Ester
    const wppE = await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
      method: "POST",
      headers: { "apikey": EVOLUTION_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        number: MEU_NUMERO,
        text: `📋 *Novo Formulário de Estágio!*\n\n*Aluno:* ${nome}\n*WhatsApp:* ${whatsapp}\n*E-mail:* ${email}\n\nAcesse o Chatwoot para ver todas as respostas.\n\n_Empire Mentis_`
      })
    });
    log.push(`WhatsApp Ester: ${wppE.status}`);

    console.log("LOG:", log.join(" | "));
    return res.status(200).json({ success: true, log });

  } catch (err) {
    console.error("ERRO:", err.message, "| LOG:", log.join(" | "));
    return res.status(500).json({ error: err.message, log });
  }
}
