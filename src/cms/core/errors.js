/**
 * Schema-time failures.
 *
 * These are developer errors — a malformed type, an unknown field type, a rule
 * that cannot apply to the field it is on. They are thrown, never returned, and
 * they fire at module evaluation time so a broken schema takes the build down
 * rather than reaching an editor as a half-rendered form.
 *
 * Deliberately NOT the `CmsError` of Contract 2: that one describes a failed
 * request and travels over the wire. This one describes a bug in config and
 * never leaves the process.
 */
export class CmsSchemaError extends Error {
  constructor(message, { code = "invalid_config", ...details } = {}) {
    super(message)
    this.name = "CmsSchemaError"
    this.code = code
    Object.assign(this, details)
  }
}

export function fail(code, message, details = {}) {
  throw new CmsSchemaError(`[cms/core] ${message}`, { code, ...details })
}

/** Where the failure happened, for error messages: `review.fields.rating`. */
export function at(...parts) {
  return parts.filter(Boolean).join(".")
}
