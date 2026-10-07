# Gemma TrailMate 🌿 — Touch Grass AI Companion

Gemma TrailMate is a voice-first outdoor AI companion built for the **Touch Grass** open-source AI challenge. Designed around the core guiding philosophy that **"the screen should be the shortest part of the experience,"** Gemma TrailMate synthesizes tailored natural exploration missions, minimizes its user interface to encourage outdoor presence, and converts raw audio reflections into beautiful private nature journal logs.

---

## 🏗️ Technical Architecture & Gemma Integration

Gemma TrailMate uses a modular, swap-ready adapter pattern:
- **Cloud Proxy (Gemma Emulator)**: Secure server-side routes proxy requests to the latest Google Gemini API (`gemini-3.8-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest` fallback ladder) wrapped with strict Gemma-2 system instructions to emulate the open-weight model accurately.
- **Custom Open-Weight Inference (Ollama / Groq / Together AI)**: An active, editable settings dashboard allows judges and developers to hot-swap cloud proxying for live, local `gemma-2-9b-it` weights running via Ollama, Together AI, or Groq.
- **Privacy-First Storage**: User reflections, species observations, and active streak stats are saved entirely locally in browser storage, keeping personal outdoor data strictly under user control.

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- NPM or PNPM

### 2. Configure Environment Secrets
Create a `.env` file in the root directory:
```bash
# Set your Gemini developer key (Required for default Cloud Proxy fallback)
GEMINI_API_KEY="AIzaSyYourKeyHere..."
PORT=3000
```

### 3. Install Dependencies & Start Dev Server
```bash
# Install packages
npm install

# Start the unified fullstack development environment
npm run dev
```
Open your browser to `http://localhost:3000` to test the live app!

---

## 🚀 Google Cloud Run Production Deployment

Deploy Gemma TrailMate to Google Cloud Run with secure Secret Manager bindings in a single command.

### 1. Create and Bind the Secret in Secret Manager
Securely publish your API key to Secret Manager instead of hardcoding it:
```bash
# Enable required Google APIs
gcloud services enable run.googleapis.com secretmanager.googleapis.com

# Create the Secret resource
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Inject your key value into the secret
echo -n "YOUR_REAL_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
# (Replace PROJECT_NUMBER with your actual Google Cloud Project Number)
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Build and Deploy the Container
Build the web app and deploy it on Cloud Run:
```bash
# Deploy with mandatory challenge-verification labels
gcloud run deploy gemma-trailmate \
  --source=. \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

---

## 🛡️ Agentic Threat Modeling & Countermeasures

Our system maintains security across the 5 principal threat zones:

| Threat Zone | Description / Risk | Mitigation Strategy |
| :--- | :--- | :--- |
| **Input Surfaces** | Prompt Injection via custom Q&A / Description | Absolute type validation and system boundary isolation. Image analysis does not parse executable text blocks. |
| **Planning & Reasoning** | Prompt Jailbreak / Model Misalignment | System prompts restrict the Gemma emulation strictly to botany, woodland survival, and outdoor education. |
| **Tool Execution** | SSRF or Remote Execution via AI | No arbitrary tools, browser fetching, or terminal toolsets are enabled in the API parameters. |
| **Memory & State** | Cross-User Private Data Leaks | Zero server-side persistence database. All streaks and personal journals are kept entirely in Client-Side LocalStorage. |
| **Inter-System Comms** | Key Exposure / Browser sniffing | Secure server proxy on Express. The browser never touches the `GEMINI_API_KEY` token. |

---

## 🎯 Verification Walkthrough

To easily verify that Gemma TrailMate functions correctly, judges can execute the following steps:
1. **Launch a Mission**: Select **"Gardening"**, **"20 Min"**, and click **"Synthesize Quest"**. Review the custom mission title and checklist returned by Gemma.
2. **Go Outside Challenge**: Click **"Go Outside Now"**. Note how the entire web UI collapses to a simple, non-addictive countdown timer and check-list.
3. **Simulate Reflection**: Click **"I'm Finished"** and navigate to the **"Journal"** tab. Click **"Simulate Mic Speech"** to simulate transcribing field recordings.
4. **Transform Entry**: Click **"Format with Gemma AI"** to see Gemma transform raw notes into poetic, rich, structured logs.
5. **Species Observation**: Go to **"Explore Nature"** and click **"Golden Oak Leaf"** under the Instant Judge Presets. Click **"Analyze Specimen"** to watch Gemma identify species features, provide tips, and output safety warnings.
