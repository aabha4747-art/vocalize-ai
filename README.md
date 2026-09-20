# 🎙️ Vocalize AI

**Vocalize AI** is a full-stack, AI-powered multilingual Text-to-Speech web application that converts written text into natural-sounding speech.

The application combines **AI-powered translation using Google Gemini** with **speech synthesis using ElevenLabs**, allowing users to enter text, select a target language and voice, generate speech, play the generated audio, download it, and save previous generations to their personal history.

The platform also supports user authentication, document text extraction, favorites, persistent audio storage, and multilingual translation.

---

## 🌐 Live Application

### Frontend

**Vocalize AI:**  
https://vocalize-ai-livid.vercel.app

### Backend API

**Render Backend:**  
https://vocalize-ai-hxts.onrender.com

### Backend Health Check

https://vocalize-ai-hxts.onrender.com/api/health

### Source Code

**GitHub Repository:**  
https://github.com/aabha4747-art/vocalize-ai

---

# ✨ Features

## 🎙️ AI Text-to-Speech

Vocalize AI allows users to convert written text into realistic speech.

Features include:

- Natural-sounding AI-generated speech
- Multiple ElevenLabs voices
- Language selection
- Voice selection
- Browser-based audio playback
- MP3 download
- Word counter
- Character counter
- Maximum text-length validation
- Error handling for failed speech generation

---

## 🌍 AI-Powered Translation

When a language other than English is selected, Vocalize AI automatically translates the entered text using **Google Gemini** before generating speech.

For example:

```text
User enters:

Good morning. How are you?

        ↓

Selects Hindi

        ↓

Google Gemini

        ↓

सुप्रभात। आप कैसे हैं?

        ↓

ElevenLabs Text-to-Speech

        ↓

Hindi Speech Audio
```

The translated text is also displayed to the user before/alongside the generated audio.

### Supported Languages

| Language | Code |
|---|---|
| English | `en` |
| Hindi | `hi` |
| Marathi | `mr` |
| Gujarati | `gu` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |

When **English** is selected, the original text is sent directly for speech generation without translation.

---

# 🔊 Audio Features

Generated speech can be played directly within the application.

Users can:

- Play audio
- Pause audio
- Seek through generated speech
- Adjust playback volume
- Adjust playback speed
- Reset playback settings
- Download generated audio as MP3

### Playback Speed

Playback speed can be adjusted from:

```text
0.7× → 3.0×
```

### Playback Volume

Volume can be adjusted from:

```text
0% → 100%
```

These settings can be modified without regenerating the speech.

---

# 📄 Document Upload & Text Extraction

Vocalize AI can extract text directly from uploaded documents.

Supported formats:

- `.txt`
- `.pdf`
- `.docx`

After extraction, the document text is automatically inserted into the text editor and can immediately be converted into speech.

### Technologies Used

**TXT**

Uses the browser File API.

**DOCX**

Uses:

```text
Mammoth.js
```

**PDF**

Uses:

```text
PDF.js
```

> PDF extraction currently supports PDFs containing embedded/selectable text. Image-only or scanned PDFs would require OCR support.

---

# 🔐 Authentication

Vocalize AI includes a complete authentication system using **Supabase Authentication**.

Users can:

- Create an account
- Log in
- Access their personal speech workspace
- Log out securely

Application data is associated with the authenticated user.

---

# 🕘 Speech History

Every successfully generated speech can be stored in the user's personal history.

History records include:

- Original text
- Translated text
- Selected language
- Selected voice
- Creation time
- Favorite status
- Stored audio reference

Users can:

- View previous generations
- Play stored audio
- Download stored audio
- Add speech to Favorites
- Remove speech from Favorites
- Delete speech history

---

# ⭐ Favorites

Users can mark useful speech generations as favorites.

A dedicated **Favorites** section allows users to quickly access their preferred speech generations.

Users can:

```text
History
   ↓
Add to Favorites
   ↓
Favorites Page
   ↓
Play / Download / Remove / Delete
```

---

# ☁️ Persistent Audio Storage

Generated audio is stored using **Supabase Storage**.

The application uses a private storage bucket:

```text
speech-audio
```

Audio is organized using user-specific storage paths.

Example:

```text
speech-audio/
│
└── user-id/
    ├── speech-001.mp3
    ├── speech-002.mp3
    └── speech-003.mp3
```

This allows generated speech to remain available through History even after the browser session ends.

---

# 🗄️ Database

Speech metadata is stored using **Supabase PostgreSQL**.

The main table used by the application is:

```text
speech_history
```

It stores information such as:

```text
id
created_at
text
translated_text
language
voice_id
voice_name
is_favorite
user_id
audio_path
```

---

# 🔒 Row Level Security

Supabase **Row Level Security (RLS)** is enabled.

Database policies ensure authenticated users can only access their own records.

Policies are implemented for:

- SELECT
- INSERT
- UPDATE
- DELETE

Supabase Storage also uses policies restricting users to their own storage folders.

---

# 🛡️ Backend Security

The Express backend contains multiple security measures.

### Helmet

Security-related HTTP headers are configured using:

```text
helmet
```

### CORS

Cross-Origin Resource Sharing is restricted to approved frontend origins.

Production frontend:

```text
https://vocalize-ai-livid.vercel.app
```

### Rate Limiting

API rate limiting helps prevent excessive API requests and abuse.

Separate protection is used for:

- General API requests
- Text-to-Speech requests
- Translation requests

### Input Validation

The backend validates:

- Text input
- Maximum text length
- Supported languages
- Voice IDs
- Request body size

### API Key Protection

Secret API keys are stored only on the backend.

The following keys are **never exposed in the React frontend**:

```text
ELEVENLABS_API_KEY
GEMINI_API_KEY
```

Environment files containing secrets are excluded from Git using `.gitignore`.

---

# 🛠️ Technology Stack

## Frontend

- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Axios

## Backend

- Node.js
- Express.js
- Axios
- Helmet
- Express Rate Limit
- CORS
- dotenv

## Artificial Intelligence

### Google Gemini

Used for:

```text
Multilingual AI Translation
```

### ElevenLabs

Used for:

```text
AI Text-to-Speech Generation
```

## Database

```text
Supabase PostgreSQL
```

## Authentication

```text
Supabase Authentication
```

## Cloud Storage

```text
Supabase Storage
```

## Document Processing

```text
PDF.js
Mammoth.js
Browser File API
```

## Deployment

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Supabase PostgreSQL |
| Authentication | Supabase |
| Audio Storage | Supabase Storage |
| Translation | Google Gemini |
| Text-to-Speech | ElevenLabs |

---

# 🏗️ Application Architecture

```text
                         USER
                           │
                           ▼
                 ┌───────────────────┐
                 │   React + Vite    │
                 │     Frontend      │
                 │      Vercel       │
                 └─────────┬─────────┘
                           │
                           │ Axios / HTTPS
                           ▼
                 ┌───────────────────┐
                 │ Node.js + Express │
                 │      Backend      │
                 │       Render      │
                 └─────┬────────┬────┘
                       │        │
              Translation      Speech
                       │        │
                       ▼        ▼
                ┌──────────┐ ┌────────────┐
                │  Gemini  │ │ ElevenLabs │
                │   API    │ │    API     │
                └──────────┘ └────────────┘


                 ┌───────────────────┐
                 │     Supabase      │
                 ├───────────────────┤
                 │ PostgreSQL        │
                 │ Authentication    │
                 │ Audio Storage     │
                 │ Row Level Security│
                 └───────────────────┘
```

---

# 🔄 Text-to-Speech Workflow

```text
User enters text
       │
       ▼
Select Language
       │
       ▼
Is English selected?
       │
   ┌───┴────┐
   │        │
  YES       NO
   │        │
   │        ▼
   │    Gemini Translation
   │        │
   └────┬───┘
        │
        ▼
Select ElevenLabs Voice
        │
        ▼
Node.js / Express Backend
        │
        ▼
ElevenLabs API
        │
        ▼
Generated MP3 Audio
        │
        ├──────────────► Browser Audio Player
        │
        ├──────────────► MP3 Download
        │
        └──────────────► Supabase Storage
                              │
                              ▼
                       Speech History
```

---

# 📁 Project Structure

```text
vocalize-ai/
│
├── client/
│   │
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── pdf.worker.min.mjs
│   │
│   ├── src/
│   │   ├── assets/
│   │   │
│   │   ├── components/
│   │   │   ├── Auth.jsx
│   │   │   └── Auth.css
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── supabase.js
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── server/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
└── README.md
```

---

# 🔌 Backend API Endpoints

Production backend:

```text
https://vocalize-ai-hxts.onrender.com
```

## Health Check

```http
GET /api/health
```

Example:

```text
https://vocalize-ai-hxts.onrender.com/api/health
```

This checks whether the backend and required AI services are configured.

---

## Get Voices

```http
GET /api/voices
```

Retrieves the available ElevenLabs voices.

---

## Translate Text

```http
POST /api/translate
```

Translates text into the selected language using Google Gemini.

Example request:

```json
{
  "text": "Good morning. How are you?",
  "targetLanguage": "hi"
}
```

---

## Generate Speech

```http
POST /api/tts
```

Converts text into speech using ElevenLabs.

Example request:

```json
{
  "text": "Good morning",
  "language": "en",
  "voice": "VOICE_ID"
}
```

The API returns MP3 audio.

---

# 🚀 Running Vocalize AI Locally

## Prerequisites

Make sure the following are installed:

```text
Node.js
npm
Git
```

You will also need:

- Supabase project
- ElevenLabs API key
- Google Gemini API key

---

## 1. Clone the Repository

```bash
git clone https://github.com/aabha4747-art/vocalize-ai.git
```

Enter the project:

```bash
cd vocalize-ai
```

---

# ⚙️ Backend Setup

Move into the backend:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create:

```text
server/.env
```

Add:

```env
PORT=5000

ELEVENLABS_API_KEY=your_elevenlabs_api_key

GEMINI_API_KEY=your_gemini_api_key

FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

The local backend will run at:

```text
http://localhost:5000
```

Test:

```text
http://localhost:5000/api/health
```

---

# 💻 Frontend Setup

Open another terminal.

Move into:

```bash
cd client
```

Install dependencies:

```bash
npm install
```

Create:

```text
client/.env
```

Add:

```env
VITE_SUPABASE_URL=your_supabase_project_url

VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# 🔑 Environment Variables

## Backend

```env
PORT=5000
ELEVENLABS_API_KEY=
GEMINI_API_KEY=
FRONTEND_URL=
```

## Frontend

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_URL=
```

Example files are included:

```text
client/.env.example
server/.env.example
```

Actual `.env` files are excluded through `.gitignore`.

**Never commit API keys or private credentials to GitHub.**

---

# 🌐 Production Deployment

## Frontend

The React/Vite frontend is deployed using **Vercel**.

Production URL:

```text
https://vocalize-ai-livid.vercel.app
```

## Backend

The Node.js/Express backend is deployed using **Render**.

Production URL:

```text
https://vocalize-ai-hxts.onrender.com
```

## Database & Storage

Supabase provides:

- PostgreSQL database
- User authentication
- Private audio storage
- Row Level Security

---

# 🧪 Major Functional Tests

The deployed application has been tested for:

- User registration
- User login
- User logout
- Voice retrieval
- English Text-to-Speech
- AI translation
- Hindi speech generation
- Gujarati speech generation
- Multilingual speech
- Audio playback
- Playback speed adjustment
- Volume adjustment
- MP3 download
- TXT upload
- PDF text extraction
- DOCX text extraction
- Speech history
- Persistent audio
- Favorites
- History deletion
- Production frontend/backend communication

---

# 🔮 Future Enhancements

Possible future improvements include:

- OCR for scanned PDFs
- Additional languages
- Additional audio formats
- AI text summarization
- Grammar correction
- AI text rewriting
- More speech customization
- Custom voice profiles
- Voice cloning with appropriate consent controls
- Improved document processing
- Mobile application
- Speech analytics
- User profile settings

---

# 👩‍💻 Developer

**Aabha Tembhurne**

B.E. Biotechnology  
RV College of Engineering (RVCE)

---

# 📌 Project Summary

Vocalize AI demonstrates the development and deployment of a modern full-stack AI application by combining:

- React frontend development
- Node.js and Express backend development
- REST API architecture
- AI translation
- AI Text-to-Speech
- User authentication
- PostgreSQL database integration
- Cloud file storage
- Document processing
- API security
- Production deployment

The project integrates multiple cloud and AI services into a single application while keeping sensitive API credentials protected on the backend.

---

## 🔗 Project Links

**Live Application**  
https://vocalize-ai-livid.vercel.app

**Backend API**  
https://vocalize-ai-hxts.onrender.com

**API Health Check**  
https://vocalize-ai-hxts.onrender.com/api/health

**GitHub Repository**  
https://github.com/aabha4747-art/vocalize-ai

---

⭐ **Vocalize AI — Turn your words into natural speech.**
