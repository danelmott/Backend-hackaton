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
          content: '¿si tengo un rendimiento de un cdt de 5m a 180 dias cual es la tasa ? ',
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