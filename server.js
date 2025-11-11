import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

//Consulta pedido Bseller

dotenv.config();
const app = express();
app.use(express.json());

const CX_TOKEN = process.env.CX_TOKEN;
const BSELLER_API_URL = process.env.BSELLER_API_URL; // https://api.bseller.com.br/sac/atendimento/entregas

app.post("/integracao/cxpress/pedido", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${CX_TOKEN}`) {
      return res.status(401).json({ message: "Token inválido ou ausente." });
    }

    const { numero_pedido } = req.body;
    if (!numero_pedido) {
      return res.status(400).json({ message: "Número do pedido é obrigatório." });
    }

    const url = `${BSELLER_API_URL}/${numero_pedido}`;
    console.log("🔎 Consultando pedido na Bseller:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": CX_TOKEN,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      /*const erro = await response.text();
      console.error("❌ Erro Bseller:", response.status, erro);
      return res.status(502).json({
        message: "Erro ao consultar o sistema de pedidos.",
        detalhe: erro,
      });*/
      const erro = await response.text();
      console.error("❌ Erro Bseller:", response.status, erro);
      if (erro.includes("não encontrado") || erro.includes("not found") || erro.includes("[]")){
        return res.status(200).json({
            message: "O número do pedido informado não existe ou não foi encontrado"
        });
      }

      return res.status (502).json({
        message: "Erro ao consultar o sistema de pedidos.",
        detalhe: erro,
      })
    }

    const data = await response.json();
    console.log("🧾 Retorno Bseller:", JSON.stringify(data, null, 2));

    if (!data.entregas || data.entregas.length === 0) {
      return res.json({
        message: "Nenhuma entrega encontrada para este pedido.",
      });
    }

    const entrega = data.entregas[0];
    const status = entrega.rastreio?.descricao || "Status não disponível";
    const dataStatus = entrega.rastreio?.dataPonto || "Data não informada";
    const usuario = entrega.rastreio?.usuario || "Não informado";
    const produto = entrega.itens?.[0]?.descricao || "Produto não identificado";
    const valor = entrega.itens?.[0]?.precoTotal || "Valor não informado";

    const msg = `Seu pedido ${numero_pedido} está com status "${status}". Última atualização em ${dataStatus}. Produto: ${produto} (R$ ${valor}).`;

    return res.json({
      message: msg,
      usuarioOrigem: usuario,
      options: { start_attendance: false },
    });
  } catch (error) {
    console.error("💥 Erro inesperado:", error);
    return res.status(500).json({
      message: "Erro interno ao consultar o pedido.",
      detalhe: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ API de integração Cxpress rodando na porta ${PORT}`)
);
