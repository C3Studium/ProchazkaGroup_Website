// /api/cms/mails/* — texty e-mailů webu, obrazovka E-maily ve Studiu.
//
//   GET  /mails                 katalog s výchozím i přepsaným zněním (session)
//   PUT  /mails/:key            uložit přepis jednoho e-mailu            (session)
//   POST /mails/:key/preview    HTML náhled s texty z formuláře          (session)
//
// Session stačí, ne vlastník: znění e-mailu je obsah, ne konfigurace — stejně
// jako text na stránce ho mění redaktor. Kam a odkud se posílá zůstává
// v /settings (vlastník).
//
// Katalog nedodává knihovna, ale web: `handleCmsRequest(req, res, { mails })`.
// Bez něj tahle větev vrací prázdný seznam a Studio obrazovku neukáže.

import { requireUser } from '../auth.js'
import { mailByKey, mailCatalog, mailCatalogItem, previewMail, writeMailTexts } from '../mails.js'
import { notFound } from '../errors.js'
import { methodNotAllowed, readJson, sendJson } from './http.js'

export const handleMails = async (req, res, segments, mails = []) => {
    const actor = await requireUser(req, res)
    const [key, action, ...rest] = segments

    if (!key) {
        if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
        return sendJson(res, 200, { mails: await mailCatalog(mails) })
    }

    const mail = mailByKey(mails, key)
    if (!mail || rest.length) throw notFound('Takový e-mail web nemá')

    if (action === 'preview') {
        if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
        const body = await readJson(req)
        return sendJson(res, 200, await previewMail(mail, body?.values))
    }

    if (action) throw notFound('Neznámý endpoint')
    if (req.method !== 'PUT') return methodNotAllowed(res, ['PUT'])

    const body = await readJson(req)
    await writeMailTexts(actor, mail, body?.values)
    return sendJson(res, 200, { mail: await mailCatalogItem(mails, key) })
}
