# CASTOR.AI

An advanced, AI-powered coding assistant and workspace sandbox, built for real-time code generation and execution. 

🚀 **[Access the Live Engine Here](https://castor-ai-ronitraman.vercel.app/)**

## Overview

Castor AI integrates a powerful execution console with a live workspace sandbox, allowing users to prompt an AI engine for complex scripts, algorithms, and application logic. The system bypasses standard timeout limitations by utilizing edge-network streaming, ensuring uninterrupted, real-time code delivery directly to the user interface.

## Tech Stack

* **Frontend:** Next.js, React, Tailwind CSS
* **Backend:** Next.js Edge API Routes
* **Core Kernel:** Google Gemini 2.5 Flash
* **Deployment & Infrastructure:** Vercel

## System Architecture

- **Edge Streaming Pipeline:** AI responses are streamed dynamically via Vercel's Edge network, neutralizing standard serverless timeouts for heavy code generation tasks.
- **Secure Vault:** API authentication is handled securely server-side, completely obfuscating core engine keys from the client layer.