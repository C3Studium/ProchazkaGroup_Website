// Kde Studio zrovna bydlí.
//
// Overlay kreslí své popupy — knihovnu médií, ořez, formulář dokumentu — do
// dokumentu, ne do svého React stromu, protože se musí dostat nad všechno
// ostatní. Dokud bylo Studio obyčejným uzlem stránky, stačilo `document.body`.
//
// Se stínovým rootem to přestalo stačit hned dvakrát. Popup vedle Studia
// v `body` má nižší `z-index` než kořen Studia (2147482000 proti
// 2147483000 — overlay je pod Studiem schválně, aby na routě /studio
// nepřekrýval jeho chrome), takže skončí ZA ním: vykreslí se správně,
// ale `elementFromPoint` nad ním vrací stínového hostitele a myš na něj
// nedosáhne. A za druhé by byl mimo hranici, tedy bez adoptovaných stylů
// a znovu vystavený hostitelskému CSS.
//
// Uvnitř Studia je obojí vyřešené: stejný stacking context, stejné styly.
// Tenhle modul je ta jedna proměnná, přes kterou se to dozví — ne globální
// objekt na `window`, aby to nešlo přepsat zvenčí.

let surface = null

/** Volá `ShadowHost`, když se root připojí a když odchází. */
export const setStudioSurface = (node) => {
    surface = node || null
}

/** Uzel uvnitř Studia, do kterého se dají portálovat popupy. `null` mimo Studio. */
export const studioSurface = () => surface
