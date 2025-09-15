

# FraudLens AI Server ⚙️  

The backend service for **FraudLens AI** – built with **Node.js + Express + Prisma**, powered by:  
- **TiDB Cloud** (SQL + vector search)  
- **RabbitMQ (CloudAMQP)** for async job queue  
- **Redis Cloud** for pub/sub realtime alerts  
- **OpenAI** for embeddings & AI explanations  
- **Webhook dispatching** to third-party apps (Slack, Teams, etc.)  
- **API Key management** for external integrations  

> For frontend integration and dashboard usage, see **[Client README](../client/README.md)**                                                                                                
> For full project overview, features, and frontend usage, see the **[Root README](../README.md)**

---

## 📂 Structure  
````
server/
│── src/
│   ├── api/          # Routes & controllers
│   ├── workers/      # RabbitMQ workers
│   ├── services/     # Business logic (AI, DB, fraud detection)
│   ├── utils/        # Helpers
│── prisma/           # Schema & migrations
│── .env.example      # Env config

````

---

## 🚀 Features  
- REST API for data ingestion (CSV, JSON, REST)  
- Fraud detection pipeline (duplicates, similarity, anomalies)  
- AI embeddings + AI-generated explanations (OpenAI/local)  
- Async processing via RabbitMQ workers  
- Realtime updates via Redis pub/sub  
- Webhook notifications for detected fraud  
- API Key creation & validation  

---

## 📖 API Documentation (Swagger)

All backend endpoints are documented via **Swagger**:  

- Local: [http://localhost:8080/api-docs](http://localhost:8080/api-docs)  
- Deployed: [https://fraud-detection-5nnz.onrender.com/api-docs](https://fraud-detection-5nnz.onrender.com/api-docs)

> Use this for testing endpoints, payload formats, and API key authorization.

---

## 🔑 Environment Variables  

See `.env.example` for required configuration:  
```env
PORT=8080
DATABASE_URL=mysql://user:password@host:4000/fraud-detection?sslaccept=strict
REDIS_URL=redis://user:password@host:port
RABBIT_URL=amqps://user:password@host/vhost
OPENAI_API_KEY=your_openai_key
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
````

---

## 🛠️ Run Locally

```bash
cd server
npm install
npm run dev
```

Runs on → [http://localhost:8080](http://localhost:8080)

---
## ⚡ Workers

Start async workers for embedding & fraud detection:

```bash
npm run start:workers
```

* Listens to RabbitMQ jobs
* Publishes realtime updates via Redis
* Handles AI embeddings + explanation generation

---

## 🛎️ Webhooks

* Send fraud alerts to Slack, Teams, Discord, etc.
* Payload example:

```json
{
  "text": "FraudLens AI Report\n\n• 1,234 records analyzed\n• 45 suspicious transactions flagged (USD $12,345.67)\n\nDetected include: Duplicate Transactions\n\nView full details in FraudLens AI App: https://fraud-detection-fawn.vercel.app/dashboard/threats"
}
```

---

## 🔑 API Keys

* Header format: `Authorization: APIKey <key>:<secret>`
* Generate keys via dashboard endpoints.
* Example request:

```bash
curl -H "Authorization: APIKey abc123:secret987" \
     -X POST http://localhost:8080/api/v1/audit/threats \
     -d '{"transactionId": "tx_00123"}'
```

---


