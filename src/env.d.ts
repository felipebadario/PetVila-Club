interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_APP_ENV?: 'development' | 'preview' | 'production';
  readonly PUBLIC_GA4_ID?: string;
  readonly PUBLIC_META_PIXEL_ID?: string;
  readonly PUBLIC_DEMO_MODE?: 'true' | 'false';
  readonly LEADS_WEBHOOK_URL?: string;
  readonly LEADS_WEBHOOK_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
