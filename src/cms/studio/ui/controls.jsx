import { forwardRef, useId } from "react"
import Link from "next/link"
import Icon from "./Icon"
import styles from "./controls.module.scss"

/** Shared controls. Kept in one file so their density stays in lockstep. */

/**
 * Pass `href` and it renders a link that looks like a button — one element, not
 * an anchor wrapped around a button. Nesting the two is invalid HTML and gives
 * screen readers two overlapping controls to announce.
 */
export const Button = forwardRef(function Button(
  { variant = "ghost", size = "md", icon, iconRight, loading, children, className = "", href, ...rest },
  ref,
) {
  const Element = href ? Link : "button"
  const iconSize = size === "sm" ? 13 : 15

  return (
    <Element
      ref={ref}
      {...(href ? { href } : { type: "button", disabled: rest.disabled || loading })}
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${loading ? styles.loading : ""} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children ? <span className={styles.label}>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
      {loading ? <span className={styles.spin} aria-hidden="true" /> : null}
    </Element>
  )
})

export function IconButton({ icon, label, size = 15, className = "", tone, ...rest }) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${tone ? styles[tone] : ""} ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

// `aria-label` goes on the input rather than on the wrapping label: a checkbox
// with no visible text — every row of the moderation queue — otherwise reaches a
// screen reader as "zaškrtávací políčko" and nothing else, and an aria-label on
// a <label> element is not part of the input's accessible name.
export function Checkbox({ checked, indeterminate, onChange, label, disabled, "aria-label": ariaLabel, ...rest }) {
  return (
    <label className={`${styles.checkbox} ${disabled ? styles.disabled : ""}`} {...rest}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        onChange={(event) => onChange?.(event.target.checked)}
        ref={(node) => {
          // Indeterminate is a DOM property, not an attribute — React cannot set it.
          if (node) node.indeterminate = Boolean(indeterminate && !checked)
        }}
      />
      <span className={styles.box} aria-hidden="true">
        <Icon name={indeterminate && !checked ? "more" : "check"} size={11} strokeWidth={2} />
      </span>
      {label ? <span className={styles.checkLabel}>{label}</span> : null}
    </label>
  )
}

export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <label className={`${styles.toggle} ${disabled ? styles.disabled : ""}`}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
      {label ? <span className={styles.toggleLabel}>{label}</span> : null}
    </label>
  )
}

/** Small tab strip for mutually exclusive filters. Options: `{ id, title, count }`. */
export function Segmented({ options, value, onChange, className = "" }) {
  return (
    <div className={`${styles.segmented} ${className}`} role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          className={`${styles.segment} ${value === option.id ? styles.segmentActive : ""}`}
          onClick={() => onChange(option.id)}
        >
          {option.title}
          {typeof option.count === "number" ? <span className={styles.segmentCount}>{option.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = "Hledat…", className = "", autoFocus }) {
  return (
    <div className={`${styles.search} ${className}`}>
      <Icon name="search" size={14} className={styles.searchIcon} />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? <IconButton icon="close" label="Vymazat" size={13} onClick={() => onChange("")} /> : null}
    </div>
  )
}

/** Native select — keyboard behaviour and mobile pickers for free. */
export function Select({ value, onChange, options, placeholder, className = "", ...rest }) {
  return (
    <div className={`${styles.selectWrap} ${className}`}>
      <select
        className={styles.select}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
        {...rest}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value ?? option.id} value={option.value ?? option.id}>
            {option.title ?? option.label ?? option.value}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={13} className={styles.selectChevron} />
    </div>
  )
}

/** Label + description + error, wrapped around any control. */
export function FieldShell({ label, description, error, required, children, id, htmlFor, actions, width }) {
  const generated = useId()
  const controlId = id || htmlFor || generated

  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ""} ${width === "half" ? styles.fieldHalf : ""}`}>
      {label ? (
        <div className={styles.fieldHead}>
          <label className={styles.fieldLabel} htmlFor={controlId}>
            {label}
            {required ? <span className={styles.required} title="Povinné pole">*</span> : null}
          </label>
          {actions}
        </div>
      ) : null}
      {description ? <p className={styles.fieldDescription}>{description}</p> : null}
      {typeof children === "function" ? children(controlId) : children}
      {error ? (
        <p className={styles.fieldMessage} role="alert">
          <Icon name="warning" size={12} />
          {error}
        </p>
      ) : null}
    </div>
  )
}
