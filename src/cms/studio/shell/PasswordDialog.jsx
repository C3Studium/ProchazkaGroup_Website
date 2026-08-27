import { useState } from "react"
import { useAuth } from "../context/StudioProvider"
import { useToast } from "../context/ToastProvider"
import { Button, FieldShell } from "../ui/controls"
import Icon from "../ui/Icon"
import styles from "./PasswordDialog.module.scss"
import { Modal } from "../ui/Modal"

const MIN_LENGTH = 10

/**
 * Change your own password. Reachable from the sidebar by everyone, because it
 * is the one account operation that is not about someone else — an editor has
 * no user screen and would otherwise depend on an owner to rotate a password
 * they have reason to think is compromised.
 *
 * The current password is required. A logged-in browser left open on a desk
 * should not be enough to take the account over, and this is the cheapest place
 * to make that true.
 */
export default function PasswordDialog({ open, onClose }) {
  const { changePassword } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", repeat: "" })
  const [state, setState] = useState({ busy: false, error: null, fields: {} })

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const close = () => {
    setForm({ currentPassword: "", newPassword: "", repeat: "" })
    setState({ busy: false, error: null, fields: {} })
    onClose()
  }

  const submit = async (event) => {
    event?.preventDefault?.()

    // Checked here and not on the server: the server never sees the repeat
    // field, because "you typed it twice differently" is a typo, not a
    // security decision, and a round trip to say so is a round trip wasted.
    if (form.newPassword !== form.repeat) {
      setState({ busy: false, error: null, fields: { repeat: "Hesla se neshodují" } })
      return
    }
    if (form.newPassword.length < MIN_LENGTH) {
      setState({ busy: false, error: null, fields: { newPassword: `Alespoň ${MIN_LENGTH} znaků` } })
      return
    }

    setState({ busy: true, error: null, fields: {} })
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success("Heslo bylo změněno.", { description: "Ostatní přihlášení byla ukončena." })
      close()
    } catch (failure) {
      setState({
        busy: false,
        error: failure?.fields ? null : failure?.message || "Heslo se nepodařilo změnit.",
        fields: failure?.fields || {},
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Změnit heslo"
      size="sm"
      description="Ostatní přihlášení se tím ukončí. Toto okno zůstane přihlášené."
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={state.busy}>
            Zrušit
          </Button>
          <Button variant="primary" onClick={submit} loading={state.busy}>
            Změnit heslo
          </Button>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit}>
        <FieldShell label="Současné heslo" error={state.fields.currentPassword}>
          {(id) => (
            <input
              id={id}
              type="password"
              className={styles.input}
              value={form.currentPassword}
              autoComplete="current-password"
              onChange={set("currentPassword")}
            />
          )}
        </FieldShell>

        <FieldShell label="Nové heslo" description={`Alespoň ${MIN_LENGTH} znaků.`} error={state.fields.newPassword}>
          {(id) => (
            <input
              id={id}
              type="password"
              className={styles.input}
              value={form.newPassword}
              autoComplete="new-password"
              onChange={set("newPassword")}
            />
          )}
        </FieldShell>

        <FieldShell label="Nové heslo znovu" error={state.fields.repeat}>
          {(id) => (
            <input
              id={id}
              type="password"
              className={styles.input}
              value={form.repeat}
              autoComplete="new-password"
              onChange={set("repeat")}
            />
          )}
        </FieldShell>

        {state.error ? (
          <p className={styles.failure} role="alert">
            <Icon name="warning" size={13} />
            {state.error}
          </p>
        ) : null}

        {/* Submit on Enter without a second visible button; the footer's is the
            one people click. */}
        <button type="submit" className={styles.hiddenSubmit} tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  )
}
