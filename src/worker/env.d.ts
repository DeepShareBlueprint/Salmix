// Estende o Env global gerado por `wrangler types` (worker-configuration.d.ts)
// com os secrets configurados via `wrangler secret put` (não aparecem no
// wrangler.json, então o gerador não os inclui automaticamente).
declare global {
  interface Env {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    SESSION_SECRET: string;
    RESEND_API_KEY?: string;
    EMAIL_PEDIDOS?: string;
    OPENAI_API_KEY?: string;
  }
}

export {};
