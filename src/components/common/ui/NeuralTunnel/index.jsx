"use client";

// Raymarched gyroid tunnel used as the page's ground. Ported to JS from the
// supplied TypeScript component; the shaders and the adaptive-quality meter are
// unchanged. Mounted once in _app behind everything — see the `--page` modifier
// in styles.scss.

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import { isGroundCovered, subscribeGround } from "../pageGround";
import * as THREE from "three";

const tunnelVertex = `
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

const tunnelFragment = `
precision highp float;

#define MAX_LAYERS 34

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform int uLayers;
uniform float uFalloff;
uniform float uBlend;
uniform float uFeedback;
uniform float uAmplitude;
uniform float uScale;
uniform float uPerspective;
uniform float uZoom;
uniform float uSpeed;
uniform float uBands;
uniform float uPhase;
uniform float uSpread;
uniform float uGamut;
uniform float uContrast;
uniform float uVignette;
uniform vec3 uInk;
uniform vec3 uHot;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uFocus;

float lattice(vec3 p) {
  return dot(cos(p), sin(p.yzx));
}

float knit(float near, float far, float k) {
  float soft = max(k, 0.0001);
  float h = clamp(0.5 + 0.5 * (far - near) / soft, 0.0, 1.0);
  return mix(far, near, h) - soft * h * (1.0 - h);
}

float cascade(vec3 p) {
  float held = 100.0;
  float amp = max(uAmplitude, 0.01);
  float shrink = max(uFalloff, 1.02);
  float creep = uClock * uSpeed;

  for (int i = 0; i < MAX_LAYERS; i++) {
    if (i >= uLayers) break;
    p.z += held * uFeedback + creep;
    held = knit(held, abs(lattice(p / amp) * amp), uBlend * amp);
    amp /= shrink;
  }
  return held;
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 plate = (2.0 * pixel - uCanvas) / max(uCanvas.y, 1.0);
  plate = plate * max(uZoom, 0.01) + uFocus;

  vec3 ray = normalize(vec3(plate, max(uPerspective, 0.001)));
  float depth = cascade(ray * uScale);

  float cycle = uPhase + depth * uBands;
  vec3 pulse = 0.5 + uGamut * cos(cycle + uSpread * vec3(0.0, 12.0, 24.0));
  pulse = pow(clamp(pulse, 0.0, 1.0), vec3(max(uContrast, 0.05)));

  vec3 tint = mix(uInk, uHot, pulse);

  vec2 edge = vPlane - 0.5;
  float cover = clamp(1.0 - uVignette * dot(edge, edge) * 2.0, 0.0, 1.0);
  float rest = uBackdropAlpha * (1.0 - cover);

  gl_FragColor = vec4(tint * cover + uBackdrop * rest, cover + rest) * uOpacity;
}
`;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const subscribeToScreen = (notify) => {
    if (typeof window === "undefined") return () => {};
    const media = window.matchMedia("(min-resolution: 2dppx)");
    media.addEventListener("change", notify);
    window.addEventListener("resize", notify);
    return () => {
        media.removeEventListener("change", notify);
        window.removeEventListener("resize", notify);
    };
};

const readScreenDpr = () =>
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;

const isClear = (paint) =>
    paint === "transparent" || paint === "none" || paint === "";

const TunnelField = ({
    layers,
    falloff,
    blend,
    feedback,
    amplitude,
    scale,
    perspective,
    zoom,
    speed,
    bands,
    phase,
    spread,
    gamut,
    contrast,
    vignette,
    color,
    hotColor,
    backgroundColor,
    opacity,
    cursorInteraction,
    cursorShift,
    paused,
    adaptiveQuality,
    targetFps,
    readPointer,
}) => {
    const materialRef = useRef(null);
    const clock = useRef(0);
    const glide = useRef({ x: 0.5, y: 0.5 });
    const budget = useRef({ frames: 0, span: 0, wins: 0 });
    const { gl, size } = useThree();

    const uniforms = useMemo(
        () => ({
            uCanvas: { value: new THREE.Vector2(1, 1) },
            uClock: { value: 0 },
            uLayers: { value: 24 },
            uFalloff: { value: 1.25 },
            uBlend: { value: 1.5 },
            uFeedback: { value: 0.6 },
            uAmplitude: { value: 0.5 },
            uScale: { value: 1 },
            uPerspective: { value: 0.1 },
            uZoom: { value: 1 },
            uSpeed: { value: 0.1 },
            uBands: { value: 20 },
            uPhase: { value: 3.5 },
            uSpread: { value: 0 },
            uGamut: { value: 1 },
            uContrast: { value: 1.85 },
            uVignette: { value: 0.3 },
            uInk: { value: new THREE.Color("#160a24") },
            uHot: { value: new THREE.Color("#e879f9") },
            uBackdrop: { value: new THREE.Color("#0a0a0a") },
            uBackdropAlpha: { value: 1 },
            uOpacity: { value: 1 },
            uFocus: { value: new THREE.Vector2(0, 0) },
        }),
        [],
    );

    useEffect(() => {
        const material = materialRef.current;
        if (!material) return;
        material.uniforms.uInk.value.set(color);
        material.uniforms.uHot.value.set(hotColor);
        const clear = isClear(backgroundColor);
        material.uniforms.uBackdropAlpha.value = clear ? 0 : 1;
        if (!clear) material.uniforms.uBackdrop.value.set(backgroundColor);
    }, [color, hotColor, backgroundColor]);

    useFrame((_, delta) => {
        const material = materialRef.current;
        if (!material) return;

        const beat = Math.min(delta, 0.05);
        if (!paused) clock.current += beat;

        const ratio = gl.getPixelRatio();
        const set = material.uniforms;
        set.uCanvas.value.set(size.width * ratio, size.height * ratio);
        set.uClock.value = clock.current;
        set.uLayers.value = Math.round(clamp(layers, 1, 34));
        set.uFalloff.value = falloff;
        set.uBlend.value = blend;
        set.uFeedback.value = feedback;
        set.uAmplitude.value = amplitude;
        set.uScale.value = scale;
        set.uPerspective.value = perspective;
        set.uZoom.value = zoom;
        set.uSpeed.value = speed * 0.1;
        set.uBands.value = bands;
        set.uPhase.value = phase;
        set.uSpread.value = spread;
        set.uGamut.value = gamut;
        set.uContrast.value = contrast;
        set.uVignette.value = vignette;
        set.uOpacity.value = opacity;

        if (cursorInteraction) {
            const pointer = readPointer();
            const ease = 1 - Math.exp(-beat * 5);
            glide.current.x += (pointer.x - glide.current.x) * ease;
            glide.current.y += (pointer.y - glide.current.y) * ease;
            set.uFocus.value.set(
                (glide.current.x - 0.5) * cursorShift * 2,
                (glide.current.y - 0.5) * cursorShift * 2,
            );
        } else {
            set.uFocus.value.set(0, 0);
        }

        if (!adaptiveQuality) return;
        const meter = budget.current;
        meter.frames += 1;
        meter.span += delta;
        if (meter.span < 0.75) return;
        const fps = meter.frames / meter.span;
        meter.frames = 0;
        meter.span = 0;
        const roof = Math.min(window.devicePixelRatio || 1, 2);
        if (fps < targetFps * 0.85 && ratio > 0.5) {
            meter.wins = 0;
            gl.setPixelRatio(Math.max(0.5, ratio * 0.75));
        } else if (fps > targetFps * 0.98 && ratio < roof) {
            meter.wins += 1;
            if (meter.wins >= 3) {
                meter.wins = 0;
                gl.setPixelRatio(Math.min(roof, ratio * 1.25));
            }
        } else {
            meter.wins = 0;
        }
    });

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={tunnelVertex}
                fragmentShader={tunnelFragment}
                uniforms={uniforms}
                transparent
                depthTest={false}
                depthWrite={false}
                premultipliedAlpha
            />
        </mesh>
    );
};

export const NeuralTunnel = ({
    layers = 24,
    falloff = 1.25,
    blend = 1.5,
    feedback = 0.6,
    amplitude = 0.5,
    scale = 1,
    perspective = 0.1,
    zoom = 1,
    speed = 1,
    bands = 20,
    phase = 3.5,
    spread = 0,
    gamut = 1,
    contrast = 1.85,
    vignette = 0.3,
    color = "#160a24",
    hotColor = "#e879f9",
    backgroundColor = "#0a0a0a",
    opacity = 1,
    cursorInteraction = true,
    cursorShift = 0.25,
    paused = false,
    adaptiveQuality = true,
    targetFps = 60,
    dpr = 1.5,
    className,
    children,
}) => {
    const shell = useRef(null);
    const pointer = useRef({ x: 0.5, y: 0.5 });
    const [awake, setAwake] = useState(true);

    // Whether anything on the page is currently covering this entirely. The
    // observer below cannot tell — see cover.js.
    const covered = useSyncExternalStore(subscribeGround, isGroundCovered, () => false);

    const screenDpr = useSyncExternalStore(
        subscribeToScreen,
        readScreenDpr,
        () => 1,
    );
    const ceiling = Math.min(screenDpr, Math.max(dpr, 0.5));

    const readPointer = useCallback(() => pointer.current, []);

    useEffect(() => {
        const node = shell.current;
        if (!node || typeof IntersectionObserver === "undefined") return;
        const watcher = new IntersectionObserver(
            ([entry]) => setAwake(entry.isIntersecting),
            { threshold: 0 },
        );
        watcher.observe(node);
        return () => watcher.disconnect();
    }, []);

    useEffect(() => {
        const node = shell.current;
        if (!node || !cursorInteraction) return;
        // Touch hygiene: the shader itself keeps running on touch — it is the
        // page's ground — but the pointer-follow has nothing to follow. With no
        // listeners attached the pointer ref stays at its centred 0.5/0.5 and
        // the glide in useFrame settles uFocus at (0,0), i.e. the un-shifted
        // frame. (The page mount passes cursorInteraction={false} anyway; this
        // covers any future call site that turns it on.)
        if (window.matchMedia("(hover: none)").matches) return;

        const track = (event) => {
            const box = node.getBoundingClientRect();
            if (!box.width || !box.height) return;
            pointer.current.x = clamp((event.clientX - box.left) / box.width, 0, 1);
            pointer.current.y = clamp(
                1 - (event.clientY - box.top) / box.height,
                0,
                1,
            );
        };

        const reset = () => {
            pointer.current.x = 0.5;
            pointer.current.y = 0.5;
        };

        node.addEventListener("pointermove", track);
        node.addEventListener("pointerleave", reset);
        return () => {
            node.removeEventListener("pointermove", track);
            node.removeEventListener("pointerleave", reset);
        };
    }, [cursorInteraction]);

    return (
        <div
            ref={shell}
            className={["neural-tunnel", className].filter(Boolean).join(" ")}
        >
            <div className="neural-tunnel-canvas">
                <Canvas
                    orthographic
                    dpr={ceiling}
                    frameloop={awake && !covered ? "always" : "demand"}
                    gl={{
                        antialias: false,
                        alpha: true,
                        powerPreference: "high-performance",
                    }}
                >
                    <TunnelField
                        layers={layers}
                        falloff={falloff}
                        blend={blend}
                        feedback={feedback}
                        amplitude={amplitude}
                        scale={scale}
                        perspective={perspective}
                        zoom={zoom}
                        speed={speed}
                        bands={bands}
                        phase={phase}
                        spread={spread}
                        gamut={gamut}
                        contrast={contrast}
                        vignette={vignette}
                        color={color}
                        hotColor={hotColor}
                        backgroundColor={backgroundColor}
                        opacity={opacity}
                        cursorInteraction={cursorInteraction}
                        cursorShift={cursorShift}
                        paused={paused}
                        adaptiveQuality={adaptiveQuality}
                        targetFps={targetFps}
                        readPointer={readPointer}
                    />
                </Canvas>
            </div>
            {children ? (
                <div className="neural-tunnel-content">{children}</div>
            ) : null}
        </div>
    );
};

export default NeuralTunnel;
