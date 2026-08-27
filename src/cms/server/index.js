// Server barrel — SERVER ONLY.
//
// Importing this from a component or from anywhere under src/cms/studio pulls
// the service-role client into the browser bundle. The Studio's entry point is
// `@/cms/server/httpDataPort`, which is deliberately not re-exported here so
// that a wrong import fails loudly instead of shipping a secret.

import { assertServer } from './env.js'

assertServer('@/cms/server')

export { CmsError, CMS_ERROR_CODES, isCmsError } from './errors.js'
export { ENV_REFERENCE } from './env.js'
export { createSupabaseDataPort, createStorageFromEnv } from './adapter.js'
export { createDocumentRepository } from './documents.js'
export { createMediaRepository } from './media.js'
export { assertStoragePort, createStorage, registerStorageDriver, STORAGE_METHODS } from './ports/storage.js'
export { createSupabaseStorage } from './ports/supabaseStorage.js'
export { createFileStorage } from './ports/fileStorage.js'
export { getAdminClient, getAnonClient } from './supabaseAdmin.js'
export { getSessionUser, requireOwner, requireUser } from './auth.js'
export { hashPassword, verifyPassword } from './password.js'
export { createUser, deleteUser, listUsers, setUserDisabled, updateUserRole } from './users.js'
export { handleCmsRequest } from './handlers/index.js'
export { buildListQuery, applyPlan, columnFor, toDocument, toAsset } from './query.js'
