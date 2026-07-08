// Augment the Env interface to include Mocha Users Service configuration
declare module 'hono' {
  interface Env {
    DB: D1Database;
    MOCHA_USERS_SERVICE_API_URL: string;
    MOCHA_USERS_SERVICE_API_KEY: string;
    RESEND_API_KEY?: string;
    EMAIL_PEDIDOS?: string;
  }
}

export {};
