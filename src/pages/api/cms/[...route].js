// Every CMS server operation, on one catch-all route.
//
//   GET    /api/cms/documents                 list       (editor)
//   POST   /api/cms/documents                 create     (editor)
//   GET    /api/cms/documents/:id             get        (editor)
//   PUT    /api/cms/documents/:id             update     (editor)
//   PATCH  /api/cms/documents/:id/field       one field  (editor, visual edit)
//   DELETE /api/cms/documents/:id             remove     (editor)
//   POST   /api/cms/documents/:id/publish     publish    (editor)
//   POST   /api/cms/documents/:id/unpublish   unpublish  (editor)
//   GET    /api/cms/media                     list       (editor)
//   POST   /api/cms/media                     upload     (editor, raw body)
//   PATCH  /api/cms/media/:id                 alt text   (editor)
//   DELETE /api/cms/media/:id                 remove     (editor)
//   GET    /api/cms/auth/user                 session    (public, nullable)
//   POST   /api/cms/auth/sign-in              password   (public, rate limited)
//   POST   /api/cms/auth/sign-out             clear      (public)
//   POST   /api/cms/auth/password             own change (signed in)
//   GET    /api/cms/auth/users                list       (owner)
//   POST   /api/cms/auth/users                invite     (owner)
//   PATCH  /api/cms/auth/users/:id            role/state (owner)
//   DELETE /api/cms/auth/users/:id            remove     (owner)
//   POST   /api/cms/reviews                   submission (public, rate limited)
//
// One route rather than a file per endpoint because the auth decision, the
// error mapping and the body-size policy are the same for all of them, and
// splitting them means repeating that in fifteen places.

// Registering the content types is a side effect of importing them, and every
// request naming a type is checked against that registry. Without this import
// the registry is empty on the server and `assertKnownType` rejects everything
// — invisible until the service-role key is set and this route first runs,
// which is the worst possible moment to discover it.
//
// `registerSchemas` rather than `@/cms/schemas` directly: the registry refuses
// duplicates on purpose, and a hot reload re-evaluates this module. The reset
// has to happen before the schema modules evaluate, and ES imports are hoisted
// above module-body statements, so it cannot be a `clearTypes()` call here.
import '@/cms/server/registerSchemas'
import { handleCmsRequest } from '@/cms/server/handlers'

export const config = {
    api: {
        // Off, for two reasons: media uploads arrive as raw bytes, and every
        // other body gets an explicit per-route size limit in handlers/http.js
        // instead of the framework's blanket default.
        bodyParser: false,
    },
}

export default function handler(req, res) {
    return handleCmsRequest(req, res)
}
