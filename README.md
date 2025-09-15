# FraudLens AI 🕵️‍♂️✨  
**AI-Powered Fraud Detection with TiDB, OpenAI, Redis, and RabbitMQ**  

FraudLens AI is an **end-to-end fraud detection system** that leverages:  
- **TiDB Cloud** → scalable SQL + vector search  
- **OpenAI embeddings & AI explanations** → semantic fraud detection + explainability  
- **Redis Pub/Sub** → realtime progress & alerts  
- **RabbitMQ** → async processing at scale  

---

## 📂 Project Structure 
``` 
fraudlens/
│── client/  # Next.js frontend (dashboard, uploads, realtime alerts)
│── server/  # Node.js backend (API, workers, queues, DB, AI)
│── README.md  # Global documentation
```

---

## 🚀 Features  
- **Upload / API ingestion** (CSV, JSON, REST)  
- **AI-powered fraud detection** using OpenAI embeddings  
- **Vector similarity search** with TiDB Cloud  
- **Realtime alerts** over WebSockets via Redis  
- **Scalable async job workers** with RabbitMQ  
- **AI explanations** to provide human-friendly fraud insights  
- **Webhook notifications** → push fraud alerts directly to Slack/Teams/Discord/etc.  
- **API key authentication** → generate keys in dashboard for secure integration into your apps

---

## ⚡ Tech Stack  
- **Frontend** → Next.js, Tailwind, WebSockets  
- **Backend** → Node.js, Express, Prisma  
- **Database** → TiDB Cloud (SQL + Vector)  
- **Queue** → RabbitMQ (CloudAMQP)  
- **Cache & Pub/Sub** → Redis Cloud  
- **AI** → OpenAI API / Local AI  
- **File Storage** → Cloudinary  

---

## 🛠️ Getting Started  

### 1. Clone Repo  
```bash
git clone https://github.com/yourusername/fraudlens.git
cd fraudlens
````

### 2. Setup Environment Variables

Copy `.env.example` in both `/client` and `/server` and configure your values.

### 3. Install Dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Run Apps

```bash
# Start backend
cd server && npm run dev

# Start frontend
cd client && npm run dev
```

* Server → [http://localhost:8080](http://localhost:8080)
* Client → [http://localhost:3000](http://localhost:3000)

---

## 🛎️ Webhooks 

FraudLens AI AI can push fraud alert summaries directly to Slack (or other webhook-compatible services).  

### Example Slack Webhook Payload  

```json
{
  "text": "FraudLens AI Report\n\n• 1,234 records analyzed\n• 45 suspicious transactions flagged (USD $12,345.67)\n\nDetected include: Duplicate Transactions\n\nView full details in FraudLens AI App: https://fraud-detection-fawn.vercel.app/dashboard/threats"
}
```

> The payload is dynamically generated for each report, including:
>
> * `totalRecords` → total records analyzed
> * `flagged` → number of suspicious transactions
> * `flaggedValue` → total USD value flagged
> * `primaryThreat` → primary fraud type detected
> * `dashboardUrl` & `reportId` → direct link to report in FraudLens AI AI dashboard

**How to Configure Webhook:**

1. Login to FraudLens AI AI dashboard → Webhooks
2. Add your Slack Webhook URL
3. All future alerts for flagged frauds will POST automatically

> This allows **realtime monitoring of fraud events** without manually checking the dashboard.

---

## 🔑 API Keys  

FraudLens AI AI allows secure integration into your apps using API keys.  

### Request Header Format  

````

Authorization: APIKey <key>:<secret>

````

- `<key>` → the public API key generated in the dashboard  
- `<secret>` → secret token associated with the key  

### Example Usage with cURL  

```bash
curl -H "Authorization: APIKey abc123:secret987" \
     -X POST http://localhost:8080/api/v1/audit/threats \
     -d '{"transactionId": "tx_00123"}'
````

---

## 📖 Detailed Documentation

For more in-depth instructions, please see the dedicated READMEs:

* **[Server Documentation](server/README.md)** → backend setup, workers, queues, AI embeddings, webhooks, API keys
* **[Client Documentation](client/README.md)** → frontend setup, dashboard, real-time alerts, file uploads, webhooks & API key management

---

## 🤝 Contributing

We welcome contributions! Please open issues & PRs.

---
