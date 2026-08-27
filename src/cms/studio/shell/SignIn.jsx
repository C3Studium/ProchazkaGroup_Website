import { useState } from "react"
import { useAuth, useStudio } from "../context/StudioProvider"
import { Button, FieldShell, IconButton } from "../ui/controls"
import Icon from "../ui/Icon"
import styles from "./SignIn.module.scss"

/**
 * The gate. Email and password, one submit, one failure message.
 *
 * The failure message is deliberately the same for an unknown address, a wrong
 * password and a disabled account, because the server sends the same one for
 * all three — telling them apart here would only invent a distinction the API
 * refuses to make, and the reason it refuses is that the difference is a list
 * of who works here.
 *
 * There is no "forgot password" link. Recovery means an owner issuing a new
 * password from the user screen, which needs no mail transport and no reset
 * tokens with their own expiry and replay problems. Four people use this.
 */
export default function SignIn() {
  const { signIn } = useAuth()
  const { config } = useStudio()
  const [form, setForm] = useState({ email: "", password: "" })
  const [reveal, setReveal] = useState(false)
  const [state, setState] = useState({ status: "idle", error: null })

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.email.trim() || !form.password) {
      setState({ status: "idle", error: "Vyplňte e-mail i heslo." })
      return
    }

    setState({ status: "sending", error: null })
    try {
      await signIn(form.email.trim(), form.password)
      // On success this component unmounts — the gate is replaced by the shell.
      // Nothing to do here, and deliberately no success state to fall through to.
    } catch (error) {
      // The password is cleared, the address is kept. Retyping an address you
      // already typed correctly is the most annoying part of a failed login.
      setForm((current) => ({ ...current, password: "" }))
      setState({ status: "idle", error: error?.message || "Přihlášení se nezdařilo." })
    }
  }

  return (
    <div className={styles.gate}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark}>
            <Icon name="layers" size={17} />
          </span>
          <div>
            <h1 className={styles.title}>{config.title}</h1>
            <p className={styles.subtitle}>Redakční systém Procházka Group</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <FieldShell label="Pracovní e-mail">
            {(id) => (
              <input
                id={id}
                type="email"
                className={styles.input}
                value={form.email}
                autoFocus
                autoComplete="username"
                placeholder="jmeno@prochazkagroup.cz"
                onChange={set("email")}
              />
            )}
          </FieldShell>

          <FieldShell label="Heslo">
            {(id) => (
              <div className={styles.secret}>
                <input
                  id={id}
                  type={reveal ? "text" : "password"}
                  className={styles.input}
                  value={form.password}
                  autoComplete="current-password"
                  onChange={set("password")}
                />
                <IconButton
                  icon={reveal ? "eyeOff" : "eye"}
                  label={reveal ? "Skrýt heslo" : "Zobrazit heslo"}
                  size={14}
                  className={styles.revealButton}
                  onClick={() => setReveal((current) => !current)}
                  tabIndex={-1}
                />
              </div>
            )}
          </FieldShell>

          {/* One message, below both fields rather than attached to either —
              the server does not say which one was wrong and neither should this. */}
          {state.error ? (
            <p className={styles.failure} role="alert">
              <Icon name="warning" size={13} />
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={state.status === "sending"}
            className={styles.submit}
          >
            Přihlásit se
          </Button>

          <p className={styles.note}>
            <Icon name="lock" size={12} />
            Přístup mají jen účty založené v tomto systému. Heslo vám předal správce webu; změnit si ho můžete po
            přihlášení.
          </p>
        </form>
      </div>

      <p className={styles.footnote}>Procházka Group — interní nástroj</p>
    </div>
  )
}
