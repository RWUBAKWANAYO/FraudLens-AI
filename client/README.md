
# FraudLens AI Client 🎨  

The frontend dashboard for **FraudLens AI**, built with **Next.js + Tailwind + WebSockets**.  

> For backend setup, async workers, and API keys, see **[Server README](../server/README.md)**  
> For full project overview & hackathon features, see **[Root README](../README.md)**

---

## 📂 Structure  
````

client/
│── app/            # Next.js 13 app router
│── components/     # UI components (alerts, dashboard, uploads)
│── context/        # Global state (upload, alerts)
│── utils/          # API client, helpers
│── .env.example    # Env config

````

---

## 🚀 Features  
- Upload CSV/JSON datasets  
- Live fraud detection progress via WebSockets  
- Realtime fraud alerts dashboard  
- AI-generated fraud explanations  
- Webhook management (Slack/Teams/Discord)  
- API key management (generate keys for external apps)  
- Authentication (demo credentials)  

> Backend integration via **[Server README](../server/README.md)** 

---

## 🔑 Environment Variables  

See `.env.example`:  
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:8080
NEXT_PUBLIC_TEST_EMAIL=demo@example.com
NEXT_PUBLIC_TEST_PASSWORD=@Demo123
````

---

## 🛠️ Run Locally

```bash
cd client
npm install
npm run dev
```

Runs on → [http://localhost:3000](http://localhost:3000)

---

## 🎥 Demo Workflow

1. Login with demo credentials
2. Upload file / send API request
3. Watch realtime fraud alerts appear
4. Read AI-powered fraud explanations
5. Configure webhook → receive alerts in Slack/Teams/Discord
6. Generate API key → integrate FraudLens AI into your own apps

---
