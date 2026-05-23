import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

import { buildSystemPrompt } from './src/prompts/buildSystemPrompt.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testClaude() {
  try {
    // Construimos el system prompt
    const systemPrompt = buildSystemPrompt('CLIENTE')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',

      max_tokens: 300,

      // SYSTEM PROMPT VA AQUÍ
      system: systemPrompt,

      // SOLO mensajes del usuario/conversación
      messages: [
        {
          role: 'user',
          content: 'que tarjeta de credito me comviene si viajo mucho y gano 5millones al mes en colombia'
        },
      ],
    })

    console.log('\n========= RESPUESTA =========\n')

    console.log(response.content[0].text)
  } catch (error) {
    console.error(error)
  }
}

testClaude()