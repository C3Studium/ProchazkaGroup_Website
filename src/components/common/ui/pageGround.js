// A way for a full-screen opaque section to tell the page's ground — the
// gyroid shader and the cursor lattice over it — that nothing of it is being
// looked at.
//
// Neither of them can work this out alone. Both are fixed behind the whole
// page, so the shader's IntersectionObserver is always intersecting and the
// lattice keeps being woken by the pointer — including while every pixel of
// both is behind a photograph, which on /nabidka is four screens of scrolling.
//
// Measured across the statistics section's closing wipe: the live shader
// doubled the median frame time (16.7ms against 8.3ms), and the lattice was
// the whole of the tail — 83ms worst frame with it running, 16.8ms without,
// and it alone accounted for every frame over 33ms. Covering them with an
// opaque layer changes nothing, because the cost is the drawing, not the
// being-seen.
//
// A count rather than a flag: two sections may overlap during a hand-off, and
// the ground must not wake up in the seam between them.
let covers = 0;
const listeners = new Set();

const publish = () => {
    const value = covers > 0;
    listeners.forEach((listener) => listener(value));
};

// Call when a section starts covering the ground. Returns the release.
export const coverGround = () => {
    covers += 1;
    publish();
    let released = false;
    return () => {
        if (released) return;
        released = true;
        covers -= 1;
        publish();
    };
};

export const subscribeGround = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const isGroundCovered = () => covers > 0;
