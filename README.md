# MeuMoney

Gestão financeira pessoal via WhatsApp.

## Stack

- Next.js 14 + TypeScript
- Supabase (PostgreSQL + Auth + RLS + Storage)
- WhatsApp Cloud API (Meta)
- Claude Haiku 4.5 (OCR + classificação)
- Whisper OpenAI (transcrição de áudio)

## Setup

1. Clone o repo
2. `cp .env.local.example .env.local`
3. Preencha as variáveis
4. `npm install`
5. `npm run dev`

## Deploy

Vercel — conectado ao branch main.
