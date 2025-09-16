# FraudLens AI 🕵️‍♂️✨  
**AI-Powered Fraud Detection with TiDB, OpenAI, Redis, and RabbitMQ**  

FraudLens AI is an **end-to-end fraud detection system** that leverages:  
- **TiDB Cloud** → scalable SQL + vector search  
- **OpenAI embeddings & AI explanations** → semantic fraud detection + explainability  
- **Redis Pub/Sub** → realtime progress & alerts  
- **RabbitMQ** → async processing at scale

<img width="1792" height="1120" alt="Screenshot 2025-09-15 at 1 21 17 PM" src="https://github.com/user-attachments/assets/352d8d59-7056-4a7a-a97f-8cc382d666ff" />


<img width="1792" height="1120" alt="Screenshot 2025-09-15 at 1 20 45 PM" src="https://github.com/user-attachments/assets/46506fac-72ae-41b5-84ed-7bbbb900323d" />

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
## 🧪 Test Data Generation

To test FraudLens AI's detection capabilities, you can generate sample transaction data with various fraud patterns:

### Using Pre-generated Test Files
For quick testing, download our sample datasets:
- [Sample CSV File](https://drive.google.com/file/d/1Gox_3_zdGNFR__H-EuF0aFYHS2ZiBWlF/view?usp=sharing)
- [Sample JSON File](https://drive.google.com/file/d/1dIQXQXxtdRxBAvHAxqzZqLv-mlkMWRs5/view?usp=sharing) 
- [Sample XLSX File](https://docs.google.com/spreadsheets/d/1SbmduFF7P1gqA1sEZTLvBWDNs4Sfr08A/edit?usp=sharing&ouid=105270043394940203946&rtpof=true&sd=true)

These files contain realistic transaction data with embedded fraud patterns to demonstrate the system's detection capabilities.

### Generating Custom Test Data
You can also generate your own test files with custom patterns:

```bash
# Navigate to server directory
cd server

# Generate all formats (JSON, CSV, XLSX)
npm run generate

# Generate specific format with custom record count
npm run generate:json  # Generate JSON
npm run generate:csv    # Generate CSV
npm run generate:xlsx   # Generate XLSX
```

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

### 📧 TiDB Cloud Account Email

> **TiDB Cloud Email (Used for This Project):**
> `rwubakwanayoolivier@gmail.com`

---

### 🔗 Project Repository URL

> **Public GitHub Repository:**
> [https://github.com/RWUBAKWANAYO/FraudLens-AI](https://github.com/RWUBAKWANAYO/FraudLens-AI)                                                                                                                                          

---

### 📜 Open Source License

> **License:**
> This project is licensed under the [MIT License](LICENSE).                                                                                                                                                                            

---

## 🤝 Contributing

We welcome contributions! Please open issues & PRs.

---


