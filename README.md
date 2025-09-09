# iCustoms Voice Assistant
## Problem

International trade compliance and customs processes are often complex, time-consuming, and error-prone. Businesses spend hours classifying HS codes, preparing documents, and ensuring compliance with multiple regulations.

## Solution

This project is an AI-powered Voice Assistant for iCustoms. It provides instant support for HS code classification, customs queries, and compliance issues. The assistant can chat via text or voice, saving time and reducing mistakes.

## What Are We Finding

We are helping users by:
- Classifying HS codes based on product descriptions.
- Answering trade and customs compliance questions.
- Assisting with documentation and regulatory issues.
- Providing real-time, AI-powered support.

## Backend

- **app.py:** Core AI logic, session handling, and logging.
- **server.py:** Flask server exposing APIs for chat and log saving.
- **prompts.py:** Defines the assistant’s system prompt and behavior.

## Frontend

- Built with **React** and styled using **Tailwind CSS**.
- Features:
  - Chat interface with smooth animations.
  - Voice input (speech recognition) and voice output (speech synthesis).
  - Session tracking with chat logs.
  - Friendly, modern UI for asking HS code and trade compliance questions.

## Tech Stack

1. **Frontend**
  - React
  - Tailwind CSS
  - Axios
2. **Backend**
  - Flask
  - Flask-CORS
  - python-dotenv
  - google-generativeai

## How It Works

1. User types or speaks a query (e.g., “Find HS code for leather jacket”).
2. The React frontend sends the query to the Flask backend.
3. Backend builds a contextual prompt and sends it to the Google Gemini AI model.
4. The model generates a concise, professional response.
5. The frontend displays the response and can also read it aloud using text-to-speech.
6. Chat logs are saved for review or auditing.

## Requirements

From requirements.txt:
- flask
- flask-cors
- python-dotenv
- google-generativeai

## Screenshots

<img width="1919" height="905" alt="image" src="https://github.com/user-attachments/assets/238d15a4-66be-4f45-ac72-aea007da7ea9" />
<img width="1919" height="906" alt="image" src="https://github.com/user-attachments/assets/de099d64-dce9-4c4d-8c3e-a7e96f38846a" />

### Chat Log Saved:

<img width="1492" height="875" alt="image" src="https://github.com/user-attachments/assets/6a59ff3e-bccb-4671-a13a-0299f97c75d1" />


