import { useState } from "react"
import { useAuth, usePort } from "../context/StudioProvider"
import { useAsync } from "../hooks/useAsync"
import { useToast } from "../context/ToastProvider"
import { formatRelative, initials } from "../lib/format"
import { Button, FieldShell, IconButton, Select } from "../ui/controls"
import { Badge, EmptyState, ErrorState, SkeletonRows } from "../ui/feedback"
import { ConfirmDialog, Modal } from "../ui/Modal"
import Icon from "../ui/Icon"
import { ResultCount, Spacer, ViewBody, ViewHeader, ViewToolbar } from "./ViewLayout"
import styles from "./UsersView.module.scss"

/**
 * The roles this screen can hand out — and `admin` is deliberately not one.
 *
 * Admin is whoever `CMS_ADMIN_EMAIL` says (server/auth.js effectiveRole), so
 * offering it here would be offering something this screen cannot actually
 * grant: the row would say admin and the server would still answer member.
 *
 * `owner` and `member` carry the same permissions today. Owner is the title a
 * client sees on their own site; keeping it as a separate value now is what
 * makes it possible to give it meaning later without touching every account.
 */
const ROLES = [
  { value: "owner", title: "Majitel" },
  { value: "member", title: "Člen" },
]

const ROLE_TITLES = { admin: "Správce", owner: "Majitel", member: "Člen" }

const roleTitle = (role) => ROLE_TITLES[role] || role

/**
 * Who can get in. Owners only — the Studio does not route an editor here and
 * the server answers 403 if one arrives anyway.
 *
 * The list is not paginated and not searchable. This is a company of thirteen
 * people and a handful of them edit the site; a search box over four rows is
 * furniture. If that ever stops being true, the port already returns `{ rows }`
 * and can grow a `total` without the screen changing shape.
 */
export default function UsersView() {
  const port = usePort()
  const toast = useToast()
  const { user: me, refresh: refreshSession } = useAuth()

  const [revision, setRevision] = useState(0)
  const { data, error, loading, reload } = useAsync(() => port.auth.users.list(), [port, revision])

  const [inviting, setInviting] = useState(false)
  const [issued, setIssued] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const rows = data?.rows || []
  const activeOwners = rows.filter((row) => row.role === "admin" && !row.disabledAt).length

  const bump = () => setRevision((current) => current + 1)

  /**
   * Every mutation goes through here so that one rule holds everywhere: after
   * changing a user, re-read the list, and if the user was me, re-read my own
   * session too — demoting yourself has to take the user screen away from you
   * on the same click, not on the next reload.
   */
  const mutate = async (id, action, message) => {
    setBusyId(id)
    try {
      await action()
      bump()
      if (id === me?.id) await refreshSession()
      if (message) toast.success(message)
    } catch (failure) {
      toast.error(failure?.message || "Akce se nezdařila.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <ViewHeader
        title="Uživatelé"
        subtitle="Kdo se může přihlásit do Studia a co smí spravovat."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setInviting(true)}>
            Přidat uživatele
          </Button>
        }
      />

      <ViewToolbar>
        <span className={styles.legend}>
          <Icon name="info" size={13} />
          Vlastník spravuje uživatele, redaktor jen obsah. Obojí se ověřuje na serveru.
        </span>
        <Spacer />
        <ResultCount>
          {rows.length} {rows.length === 1 ? "účet" : rows.length < 5 ? "účty" : "účtů"}
        </ResultCount>
      </ViewToolbar>

      <ViewBody>
        {loading && !data ? (
          <SkeletonRows count={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="users"
            title="Žádné účty"
            description="To by nemělo nastat — do Studia se nikdo nedostane. Zkontrolujte proměnné CMS_ADMIN_EMAIL a CMS_ADMIN_PASSWORD."
          />
        ) : (
          <ul className={styles.rows}>
            {rows.map((row) => (
              <UserRow
                key={row.id}
                user={row}
                isMe={row.id === me?.id}
                busy={busyId === row.id}
                // The last active owner cannot be demoted, disabled or deleted.
                // Disabling the controls says so before the click; the server
                // and a database trigger say so after it.
                locked={row.role === "admin" && !row.disabledAt && activeOwners <= 1}
                onRole={(role) =>
                  mutate(row.id, () => port.auth.users.updateRole({ id: row.id, role }), `Role změněna na „${roleTitle(role)}".`)
                }
                onDisabled={(disabled) =>
                  mutate(
                    row.id,
                    () => port.auth.users.setDisabled({ id: row.id, disabled }),
                    disabled ? "Účet byl deaktivován." : "Účet byl obnoven.",
                  )
                }
                onRemove={() => setRemoving(row)}
              />
            ))}
          </ul>
        )}
      </ViewBody>

      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        onCreate={async (input) => {
          const result = await port.auth.users.create(input)
          bump()
          setInviting(false)
          // A generated password exists exactly once, in this response. If the
          // dialog closed without showing it, it would be gone for good.
          if (result?.temporaryPassword) setIssued(result)
          else toast.success("Uživatel byl vytvořen.")
        }}
      />

      <IssuedDialog issued={issued} onClose={() => setIssued(null)} />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Smazat uživatele?"
        description={
          removing?.id === me?.id
            ? `Smažete vlastní účet (${removing?.email}) a okamžitě vás to odhlásí. Obsah, který jste vytvořili, zůstane.`
            : `Účet ${removing?.email} bude smazán a jeho přihlášení okamžitě přestane platit. Obsah, který vytvořil, zůstane. Pokud jde jen o odchod na čas, použijte raději deaktivaci.`
        }
        confirmLabel="Smazat"
        busy={busyId === removing?.id}
        onConfirm={async () => {
          const target = removing
          setRemoving(null)
          await mutate(target.id, () => port.auth.users.remove({ id: target.id }), "Uživatel byl smazán.")
        }}
      />
    </>
  )
}

function UserRow({ user, isMe, busy, locked, onRole, onDisabled, onRemove }) {
  const disabled = Boolean(user.disabledAt)

  return (
    <li className={`${styles.row} ${disabled ? styles.rowOff : ""}`}>
      <span className={styles.avatar} aria-hidden="true">
        {initials(user.name || user.email)}
      </span>

      <span className={styles.identity}>
        <span className={styles.name}>
          {user.name || user.email}
          {isMe ? <span className={styles.you}>vy</span> : null}
        </span>
        <span className={styles.email}>{user.email}</span>
      </span>

      <span className={styles.state}>
        {disabled ? (
          <Badge tone="danger" dot>
            Deaktivován
          </Badge>
        ) : user.lastLoginAt ? (
          <Badge tone="neutral">{formatRelative(user.lastLoginAt)}</Badge>
        ) : (
          <Badge tone="accent" dot>
            Zatím nepřihlášen
          </Badge>
        )}
      </span>

      <span className={styles.role}>
        <Select
          value={user.role}
          options={ROLES}
          disabled={busy || locked}
          onChange={(value) => value && value !== user.role && onRole(value)}
          aria-label={`Role uživatele ${user.email}`}
        />
      </span>

      <span className={styles.actions}>
        <IconButton
          icon={disabled ? "refresh" : "lock"}
          label={disabled ? "Obnovit přístup" : "Deaktivovat"}
          disabled={busy || (locked && !disabled)}
          onClick={() => onDisabled(!disabled)}
        />
        <IconButton
          icon="trash"
          label="Smazat"
          tone="danger"
          disabled={busy || locked}
          onClick={onRemove}
        />
      </span>

      {/* Always rendered, filled only when it applies. A note that appears on
          one row and not the others would otherwise shorten that row's controls
          and break the column the eye is reading down. */}
      <span className={styles.lockNote} title={locked ? "Systém musí mít alespoň jednoho aktivního vlastníka" : undefined}>
        {locked ? (
          <>
            <Icon name="info" size={12} />
            poslední vlastník
          </>
        ) : null}
      </span>
    </li>
  )
}

/**
 * Invite or create. The owner may set a password or leave it blank and let the
 * server generate one — blank is the default because a password chosen by
 * someone else, in a hurry, for a colleague, is reliably a bad password.
 */
function InviteDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ email: "", name: "", role: "editor", password: "" })
  const [state, setState] = useState({ busy: false, error: null, fields: {} })

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))

  const close = () => {
    setForm({ email: "", name: "", role: "editor", password: "" })
    setState({ busy: false, error: null, fields: {} })
    onClose()
  }

  const submit = async () => {
    setState({ busy: true, error: null, fields: {} })
    try {
      await onCreate({
        email: form.email.trim(),
        name: form.name.trim(),
        role: form.role,
        password: form.password || undefined,
      })
      setForm({ email: "", name: "", role: "editor", password: "" })
      setState({ busy: false, error: null, fields: {} })
    } catch (failure) {
      setState({
        busy: false,
        error: failure?.message || "Uživatele se nepodařilo vytvořit.",
        fields: failure?.fields || {},
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Přidat uživatele"
      description="Účet vznikne hned. Heslo mu předejte osobně — e-mail se odsud neposílá."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={state.busy}>
            Zrušit
          </Button>
          <Button variant="primary" onClick={submit} loading={state.busy}>
            Vytvořit
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <FieldShell label="E-mail" required error={state.fields.email}>
          {(id) => (
            <input
              id={id}
              type="email"
              className={styles.input}
              value={form.email}
              autoComplete="off"
              placeholder="jmeno@prochazkagroup.cz"
              onChange={(event) => set("email")(event.target.value)}
            />
          )}
        </FieldShell>

        <FieldShell label="Jméno" description="Zobrazuje se v seznamu a u autorství.">
          {(id) => (
            <input
              id={id}
              type="text"
              className={styles.input}
              value={form.name}
              autoComplete="off"
              onChange={(event) => set("name")(event.target.value)}
            />
          )}
        </FieldShell>

        <FieldShell label="Role" error={state.fields.role}>
          <Select value={form.role} options={ROLES} onChange={(value) => set("role")(value || "member")} />
        </FieldShell>

        <FieldShell
          label="Heslo"
          description="Nechte prázdné a systém vygeneruje bezpečné heslo, které vám ukáže jednou."
          error={state.fields.password}
        >
          {(id) => (
            <input
              id={id}
              type="text"
              className={styles.input}
              value={form.password}
              autoComplete="new-password"
              placeholder="Vygenerovat automaticky"
              onChange={(event) => set("password")(event.target.value)}
            />
          )}
        </FieldShell>

        {state.error ? (
          <p className={styles.failure} role="alert">
            <Icon name="warning" size={13} />
            {state.error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

/**
 * The generated password, shown once. There is no endpoint that can produce it
 * again — the row holds a scrypt hash and nothing else — so the dialog says so
 * plainly rather than letting someone close it and find out later.
 */
function IssuedDialog({ issued, onClose }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(issued.temporaryPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission refused; the value is on screen and selectable.
    }
  }

  return (
    <Modal
      open={Boolean(issued)}
      onClose={onClose}
      title="Heslo pro nový účet"
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose}>
          Mám zkopírováno
        </Button>
      }
    >
      <p className={styles.issuedIntro}>
        Účet <strong>{issued?.user?.email}</strong> je vytvořen. Předejte mu toto heslo — po přihlášení si ho může
        změnit.
      </p>
      <div className={styles.secretRow}>
        <code className={styles.secret}>{issued?.temporaryPassword}</code>
        <Button variant="secondary" size="sm" icon={copied ? "check" : "link"} onClick={copy}>
          {copied ? "Zkopírováno" : "Kopírovat"}
        </Button>
      </div>
      <p className={styles.issuedWarning}>
        <Icon name="warning" size={13} />
        Zavřením okna heslo zmizí. Uložené je jen jako otisk, takže ho nikdo — ani vy — už znovu nezjistí. Pokud se
        ztratí, vytvořte účet znovu.
      </p>
    </Modal>
  )
}
