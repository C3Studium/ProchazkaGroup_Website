// Circular "Nahlášení pojistného" badge. The rotation is a pure CSS keyframe
// on a fixed-size, clipped layer (see styles.scss) — the previous
// implementation drove the transform from JS every animation frame, which
// caused compositor flicker at layer edges on some GPUs.
export default function RotatingButton({ text = "Nahlášení pojistného - Nahlášení pojistného - " }) {
    const letters = Array.from(text);
    const step = 360 / letters.length;

    return (
        <div className="RotatingButton">
            <p className="RotatingButton__ring" aria-label={text}>
                {letters.map((letter, index) => (
                    <span
                        key={index}
                        aria-hidden="true"
                        style={{ transform: `rotate(${(index * step).toFixed(2)}deg)` }}
                    >
                        {letter}
                    </span>
                ))}
            </p>
            <span className="RotatingButton__center" />
        </div>
    );
}
