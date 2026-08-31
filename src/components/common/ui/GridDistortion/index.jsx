"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// The displacement is read out of a small data texture, one texel per cell. It
// is sampled with NearestFilter, so a whole cell moves together and the picture
// breaks into blocks rather than shearing smoothly — that is the one change
// that makes this the same family as the lattice that lights under the cursor.
const fragmentShader = `
precision highp float;

uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec2 uCover;
uniform float uAmount;
varying vec2 vUv;

void main() {
  vec2 offset = texture2D(uDataTexture, vUv).rg;
  vec2 uv = (vUv - 0.5) * uCover + 0.5 - uAmount * offset;
  gl_FragColor = texture2D(uTexture, uv);
}`;

// A picture that the pointer pushes around, in square blocks.
//
// Three things are different from the component this came from.
//
// Its grid was `size × size` over a plane of the container's aspect, so a cell
// was only square when the container was. Here the cell is given in pixels and
// the grid is counted out of the box, so a cell is a square at any shape — and
// the block size can be set to the same 150px the cursor lattice uses.
//
// Its data texture was seeded with random noise, which leaves the picture
// permanently scrambled with nobody near it. Here it starts at zero: the image
// is whole until the pointer disturbs it, and relaxes back to whole when it
// leaves. A photograph of a person is not an effect surface.
//
// And it sleeps. The original renders every frame forever; this one stops when
// the last cell has relaxed and wakes on the next pointer move, because the
// page already has a full-screen raymarch behind it.
// The size the photograph goes to the GPU at.
//
// THREE.TextureLoader is handed a URL and fetches it, which means it gets the
// file as it sits on disk — and the files on disk are camera originals.
// Measured over one scroll of the homepage, the textures uploaded were
// 6014x4016, 5540x5540 and 3951x5926: 92, 117 and 89 megabytes of GPU memory
// each, for canvases whose laid-out boxes are between 259 and 907 pixels wide.
// The upload itself is the cost that shows — a single texSubImage2D of a
// 5540px photograph is tens of milliseconds of blocked main thread, and it is
// what the ~200ms frames on a scroll of the homepage and /o-nas were.
//
// The fallback <Image> underneath has never had this problem: Next resizes what
// it serves. So the texture is pointed at the same optimiser rather than at the
// original, at a width that matches the box it will be drawn in. OfferHero
// already did this by hand, with a _2000 copy of its photograph committed
// beside the original and a comment explaining why; this is that fix made
// general, and that call site now gets it without the second file.
//
// Only same-origin paths are rewritten. A data: URI, an .svg, an already
// optimised URL or anything absolute is handed through untouched — and if the
// optimiser refuses what it is given, boot() falls back to the original URL, so
// the worst case is the behaviour this replaces.
const NEXT_WIDTHS = [640, 750, 828, 1080, 1200, 1920];

// One of next.config's images.qualities. A value outside that list is a 400
// from the optimiser rather than a fall back to a default, which is how this
// was found: 75 — the framework's own default — is not in this site's list,
// and every texture quietly took the original-size path instead.
const QUALITY = 80;

const textureUrl = (src, boxWidth) => {
    if (typeof src !== "string" || !src.startsWith("/") || src.startsWith("//")) return src;
    if (src.startsWith("/_next/image") || src.endsWith(".svg")) return src;
    // Retina, but only to a point: this is a photograph with a ripple running
    // through it, not a diagram, and the second pixel is not visible in it.
    const want = (boxWidth || 900) * Math.min(window.devicePixelRatio || 1, 2);
    const w = NEXT_WIDTHS.find((n) => n >= want) ?? NEXT_WIDTHS[NEXT_WIDTHS.length - 1];
    return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${QUALITY}`;
};

export default function GridDistortion({
    imageSrc,
    alt = "",
    cellSize = 48,
    reach = 0.16,
    // Turned right down from the reference's settings. At its values the
    // picture tears; at these the blocks shift by a couple of pixels and settle,
    // which is enough to notice and not enough to look at. It is a photograph of
    // a person, and the effect is a texture on it, not the point of it.
    strength = 0.05,
    relaxation = 0.86,
    amount = 0.005,
    className = "",
    children,
}) {
    const containerRef = useRef(null);
    // The canvas only covers the picture once it has one to draw. Until then —
    // and for good, if this browser has no WebGL to give — what shows is the
    // `children`, which is the ordinary optimised <Image>. So the photo is in
    // the markup, sized and served like every other image on the page, and the
    // canvas is an enhancement laid over it rather than a replacement for it.
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Touch hygiene: the whole effect is the pointer pushing blocks
        // around, and a finger dragging over a photo is scrolling, not
        // pointing. With no pointer to answer, the WebGL boot below would buy
        // a context per picture to render a picture that never moves — so on a
        // touch device it is skipped outright: `ready` stays false and the
        // ordinary optimised <Image> in the fallback layer is the picture.
        // Some call sites (WhoWeAre) already skip this component on touch at
        // their end; this guard makes the same true for the ones that don't.
        if (window.matchMedia("(hover: none)").matches) return;

        // Everything below used to run from mount to unmount, which meant one
        // WebGL context per picture held for the life of the page — on top of
        // the one the page's shader ground already holds. Browsers hand out a
        // limited number and are stingier about it on battery; past the limit
        // the context simply fails to be created and the picture stays on its
        // fallback, which is exactly what it looked like. So the context is
        // taken when the picture comes near the viewport and given back when it
        // leaves: at most a couple are alive at once, however many pictures the
        // page grows to.
        const boot = () => {

            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10, 10);
            let renderer;
            try {
                renderer = new THREE.WebGLRenderer({
                    antialias: false,
                    alpha: true,
                    powerPreference: "high-performance",
                });
            } catch {
                // No context to be had: the fallback below is already on screen and
                // stays there, which is the whole reason it is a layer and not a
                // placeholder.
                return;
            }
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setClearColor(0x000000, 0);
            container.appendChild(renderer.domElement);

            const uniforms = {
                uTexture: { value: null },
                uDataTexture: { value: null },
                uCover: { value: new THREE.Vector2(1, 1) },
                uAmount: { value: amount },
            };

            const material = new THREE.ShaderMaterial({
                uniforms,
                vertexShader,
                fragmentShader,
                transparent: true,
            });
            const geometry = new THREE.PlaneGeometry(1, 1);
            scene.add(new THREE.Mesh(geometry, material));

            let cols = 1;
            let rows = 1;
            let data = new Float32Array(4);
            let dataTexture = null;
            let imageAspect = 1;
            let width = 0;
            let height = 0;

            const buildGrid = () => {
                cols = Math.max(2, Math.min(64, Math.round(width / cellSize)));
                rows = Math.max(2, Math.min(64, Math.round(height / cellSize)));
                data = new Float32Array(4 * cols * rows);
                dataTexture?.dispose();
                dataTexture = new THREE.DataTexture(
                    data, cols, rows, THREE.RGBAFormat, THREE.FloatType,
                );
                // The whole point: no interpolation between texels, so a cell is a
                // block with edges rather than a smooth bump.
                dataTexture.minFilter = THREE.NearestFilter;
                dataTexture.magFilter = THREE.NearestFilter;
                dataTexture.needsUpdate = true;
                uniforms.uDataTexture.value = dataTexture;
            };

            const fitCover = () => {
                const boxAspect = width / height;
                uniforms.uCover.value.set(
                    imageAspect > boxAspect ? boxAspect / imageAspect : 1,
                    imageAspect > boxAspect ? 1 : imageAspect / boxAspect,
                );
            };

            const resize = () => {
                // The layout box, not the painted one.
                //
                // getBoundingClientRect() reports the element after every
                // transform on it and on its ancestors, and this canvas is
                // routinely mounted inside a scaled parent — both heroes put a
                // scroll-driven scale on the photo. Sized from the rect, the
                // renderer was built at the scaled dimensions and then scaled
                // again by the same transform: measured on /nabidka the canvas
                // came out 1929x1148 inside a 1512x900 box, exactly the 1.16 x
                // 1.10 that was on it at the time. The picture in the canvas
                // was therefore a different size from the picture in the
                // <img> underneath, and fading between them showed both.
                //
                // offsetWidth/offsetHeight are the laid-out size and ignore
                // transforms, which is what the fallback <img> is sized by too.
                const width0 = container.offsetWidth;
                const height0 = container.offsetHeight;
                if (!width0 || !height0) return;
                width = width0;
                height = height0;
                renderer.setSize(width, height);
                buildGrid();
                fitCover();
                wake();
            };

            const loader = new THREE.TextureLoader();

            const onTexture = (texture) => {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                imageAspect = texture.image.width / texture.image.height;
                uniforms.uTexture.value = texture;
                fitCover();
                wake();
                setReady(true);
            };

            // offsetWidth for the same reason resize() uses it: the laid-out
            // box, not the transformed one. Several of these canvases sit
            // inside a scroll-driven scale, and sizing the texture from a
            // rect would buy a different picture at every scroll position.
            const sized = textureUrl(imageSrc, container.offsetWidth);
            loader.load(sized, onTexture, undefined, () => {
                // The optimiser would not serve it. A picture at the wrong
                // size beats no picture, so this takes the original.
                if (sized !== imageSrc) loader.load(imageSrc, onTexture);
            });

            const pointer = { x: -1, y: -1, vx: 0, vy: 0, inside: false };

            const onMove = (event) => {
                const rect = container.getBoundingClientRect();
                const px = (event.clientX - rect.left) / rect.width;
                const py = 1 - (event.clientY - rect.top) / rect.height;
                pointer.vx = px - pointer.x;
                pointer.vy = py - pointer.y;
                pointer.x = px;
                pointer.y = py;
                pointer.inside = true;
                wake();
            };

            const onLeave = () => {
                pointer.inside = false;
                pointer.vx = 0;
                pointer.vy = 0;
            };

            let raf = 0;
            let running = false;

            const frame = () => {
                let energy = 0;

                for (let i = 0; i < cols * rows; i++) {
                    data[i * 4] *= relaxation;
                    data[i * 4 + 1] *= relaxation;
                    energy += Math.abs(data[i * 4]) + Math.abs(data[i * 4 + 1]);
                }

                if (pointer.inside) {
                    const gx = cols * pointer.x;
                    const gy = rows * pointer.y;
                    const maxDist = Math.max(cols, rows) * reach;
                    const maxSq = maxDist * maxDist;
                    for (let row = 0; row < rows; row++) {
                        for (let col = 0; col < cols; col++) {
                            const distSq = (gx - col) ** 2 + (gy - row) ** 2;
                            if (distSq >= maxSq) continue;
                            const i = 4 * (col + cols * row);
                            const power = Math.min(maxDist / Math.sqrt(distSq || 0.0001), 10);
                            data[i] += strength * 100 * pointer.vx * power;
                            data[i + 1] -= strength * 100 * pointer.vy * power;
                        }
                    }
                    // consumed — a pointer that stops moving stops pushing
                    pointer.vx = 0;
                    pointer.vy = 0;
                    energy += 1;
                }

                if (dataTexture) dataTexture.needsUpdate = true;
                renderer.render(scene, camera);

                // Below this the blocks are back within a fraction of a pixel of
                // where they started and there is nothing left to draw.
                if (energy < 0.01) {
                    running = false;
                    return;
                }
                raf = requestAnimationFrame(frame);
            };

            function wake() {
                if (running) return;
                running = true;
                raf = requestAnimationFrame(frame);
            }

            const sizeWatch = new ResizeObserver(resize);
            sizeWatch.observe(container);
            resize();

            container.addEventListener("pointermove", onMove, { passive: true });
            container.addEventListener("pointerleave", onLeave);

            return () => {
                cancelAnimationFrame(raf);
                sizeWatch.disconnect();
                container.removeEventListener("pointermove", onMove);
                container.removeEventListener("pointerleave", onLeave);
                geometry.dispose();
                material.dispose();
                dataTexture?.dispose();
                uniforms.uTexture.value?.dispose();
                renderer.dispose();
                renderer.forceContextLoss();
                if (container.contains(renderer.domElement)) {
                    container.removeChild(renderer.domElement);
                }
            };
        };

        let stop = null;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    if (!stop) stop = boot();
                } else if (stop) {
                    stop();
                    stop = null;
                    setReady(false);
                }
            },
            // Started a little before it is on screen, so the texture is up by
            // the time the picture is.
            { rootMargin: "300px" },
        );
        observer.observe(container);

        return () => {
            observer.disconnect();
            stop?.();
        };
    }, [imageSrc, cellSize, reach, strength, relaxation, amount]);

    return (
        <div
            className={["gridDistortion", className].filter(Boolean).join(" ")}
            data-cursor="frame"
        >
            <div className="gridDistortion__fallback" aria-hidden={ready}>
                {children}
            </div>
            <div
                ref={containerRef}
                className={`gridDistortion__canvas${ready ? " is-ready" : ""}`}
                role={children ? "presentation" : "img"}
                aria-label={children ? undefined : alt}
            />
        </div>
    );
}
