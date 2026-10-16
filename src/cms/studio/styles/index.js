// VYGENEROVÁNO scripts/generate-style-index.mjs — needituj.
//
// Každý stylopis Studia na jednom místě, aby se z něj daly přečíst jména
// tříd. Podle nich se vybírají pravidla, která patří nám — viz
// `studioCss()` v ./adopt.js.

import s0 from "../../edit/overlay/overlay.module.scss"
import s1 from "../../manage/ManageWidget.module.scss"
import s2 from "../Studio.module.scss"
import s3 from "../context/ToastProvider.module.scss"
import s4 from "../fields/inputs/inputs.module.scss"
import s5 from "../media/media.module.scss"
import s6 from "../preview/preview.module.scss"
import s7 from "../shell/PasswordDialog.module.scss"
import s8 from "../shell/Shell.module.scss"
import s9 from "../shell/Sidebar.module.scss"
import s10 from "../shell/SignIn.module.scss"
import s11 from "../ui/Modal.module.scss"
import s12 from "../ui/controls.module.scss"
import s13 from "../ui/feedback.module.scss"
import s14 from "../views/ArchiveView.module.scss"
import s15 from "../views/ConflictDialog.module.scss"
import s16 from "../views/DocumentEditorView.module.scss"
import s17 from "../views/DocumentListView.module.scss"
import s18 from "../views/EditView.module.scss"
import s19 from "../views/ModerationView.module.scss"
import s20 from "../views/OverviewView.module.scss"
import s21 from "../views/SettingsView.module.scss"
import s22 from "../views/StatsView.module.scss"
import s23 from "../views/UsersView.module.scss"
import s24 from "../views/ViewLayout.module.scss"
import s25 from "../views/VisualSurfaceNotice.module.scss"

export const SHEETS = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25]

/** Každé hashované jméno třídy, které Studio používá. */
export const classNames = () =>
    SHEETS.flatMap((sheet) => Object.values(sheet || {})).filter(
        (name) => typeof name === "string" && name,
    )
