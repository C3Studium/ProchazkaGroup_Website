// Routy, které Studio volá mimo /api/cms.
//
// Nejsou součástí catch-all obsluhy, protože nedělají to co ona: neobsluhují
// data, ale REŽIM prohlížeče — otevřou náhled v draft módu, přepnou editační
// relaci, posunou web do minulosti. Každá sahá na cookies odpovědi a Next je
// v Pages Routeru čte podle routy, ne podle těla požadavku.
//
// Chybí-li kterákoli z nich, Studio se tváří, že běží, a tiše nefunguje:
// „Upravit kontent" ohlásí 404 v konzoli a editační plocha se nikdy nezapne.
// Proto je zakládá instalátor, ne dokumentace.
export { handleEdit } from './edit.js'
export { handlePreview } from './preview.js'
export { handleMoment } from './moment.js'
export { handleAsof } from './asof.js'
