// Servírování médií z disku — logika je v CMS, tenhle soubor jí dává adresu.
export { default } from '@/cms/server/assetRoute'

export const config = { api: { bodyParser: false } }
