'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { WINDOW_DAWN } from './ProjectedWindowFallback';

type WallLightingProps = {
  rootRef: RefObject<HTMLDivElement | null>;
  mode: 'light' | 'dark';
  onReady?: (ready: boolean) => void;
  revealProgress?: MotionValue<number>;
};

const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uLightY;
  uniform float uDark;
  uniform float uReveal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 light = vec2(1.05, uLightY);
    vec2 lampDirection = vec2((light.x - uv.x) * aspect, light.y - uv.y);
    float distanceToLight = length(lampDirection);
    float pool = exp(-distanceToLight * distanceToLight * 1.15);
    float sideGlow = exp(-pow((1.0 - uv.x) * 7.0, 2.0))
      * exp(-pow((uv.y - uLightY) * 1.7, 2.0));

    // A projected window, with soft frame shadows, falls diagonally across plaster.
    float reveal = clamp(uReveal, 0.0, 1.0);
    // Inverse projection of a window lit from the upper right. At low solar
    // elevation the rectangle is compressed sideways and stretched along the
    // wall; a projective denominator makes opposite edges converge as well.
    // Use the untouched coordinates at 1.0 for an exact settled-background handoff.
    vec2 projected = uv;
    if (reveal < 1.0) {
      vec2 sourceAnchor = vec2(${WINDOW_DAWN.sourceX}, ${WINDOW_DAWN.sourceY});
      vec2 fromSource = uv - sourceAnchor;
      vec2 compression = mix(vec2(${WINDOW_DAWN.compressionX}, ${WINDOW_DAWN.compressionY}), vec2(1.0), reveal);
      float perspective = 1.0 + (1.0 - reveal)
        * (${WINDOW_DAWN.perspectiveX} * fromSource.x + ${WINDOW_DAWN.perspectiveY} * fromSource.y);
      projected = sourceAnchor + fromSource * compression / perspective;
    }
    float shear = mix(${WINDOW_DAWN.shear}, 0.55, reveal);
    float tilt = mix(${WINDOW_DAWN.tilt}, 0.16, reveal);
    float heightOffset = mix(${WINDOW_DAWN.drop}, 0.0, reveal);
    vec2 windowUv = vec2(
      projected.x - shear * (projected.y - 0.5),
      projected.y + tilt * projected.x + heightOffset
    );
    float softness = 0.025 + (1.0 - uv.y) * 0.014;
    float windowLight = smoothstep(0.22, 0.22 + softness, windowUv.x)
      * (1.0 - smoothstep(0.98, 0.98 + softness, windowUv.x))
      * smoothstep(0.12, 0.12 + softness, windowUv.y);
    float upright = 1.0 - smoothstep(0.008, 0.008 + softness, abs(windowUv.x - 0.68));
    float crossbar = 1.0 - smoothstep(0.007, 0.007 + softness, abs(windowUv.y - 0.61));
    float sunlight = windowLight * (1.0 - 0.82 * max(upright, crossbar));

    float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.004;
    float mottling = (hash(floor(gl_FragCoord.xy / 4.0)) - 0.5) * 0.002;
    vec3 nightWall = vec3(0.13, 0.13, 0.115) * (0.79 + pool * 0.18)
      + vec3(0.20, 0.18, 0.11) * pool * 0.70;
    nightWall += vec3(0.12, 0.105, 0.064) * sideGlow;
    vec3 dayWall = vec3(0.77, 0.765, 0.72)
      + vec3(0.17, 0.15, 0.10) * sunlight
      + vec3(0.025, 0.025, 0.023) * pool;
    // Bring up the existing illumination without changing its settled palette.
    dayWall *= mix(0.68, 1.0, reveal);
    dayWall += vec3(0.045, 0.018, 0.0) * (1.0 - reveal) * windowLight;
    nightWall *= mix(0.48, 1.0, reveal);
    vec3 wall = mix(dayWall, nightWall, uDark);
    vec3 color = wall + grain + mottling;
    float vignette = 1.0 - smoothstep(0.20, 0.95, distance(uv, vec2(0.58, 0.54)));
    color *= 0.96 + vignette * 0.04;
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Static wall illumination; text stays in the native scrolling layer. */
export default function WallLighting({
  rootRef,
  mode,
  onReady,
  revealProgress,
}: WallLightingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(onReady);
  const modeRef = useRef(mode);
  const revealRef = useRef(revealProgress);
  const invalidateRef = useRef<(() => void) | null>(null);
  const [contextVersion, setContextVersion] = useState(0);
  readyRef.current = onReady;
  modeRef.current = mode;
  revealRef.current = revealProgress;

  useEffect(() => {
    invalidateRef.current?.();
  }, [mode]);

  useEffect(() => {
    invalidateRef.current?.();
    return revealProgress?.on('change', () => invalidateRef.current?.());
  }, [revealProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (canvas) {
      canvas.dataset.rendererStatus = `initializing:root=${Boolean(root)}`;
    }
    if (!canvas || !root) {
      return;
    }

    let disposed = false;
    let renderFailed = false;
    let contextInvalidated = false;
    let frame = 0;
    let ready = false;
    canvas.style.visibility = 'hidden';
    let lightY = 0.96;
    let targetLightY = lightY;
    let width = 0;
    let height = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      canvas.dataset.rendererStatus = 'context-unavailable';
      readyRef.current?.(false);
      return;
    }

    const shaders: WebGLShader[] = [];
    const makeShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) {
        throw new Error('Shader unavailable');
      }
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
      }
      return shader;
    };
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const release = () => {
      // Restoration creates a new resource generation. Deleting handles from the
      // lost generation can queue INVALID_OPERATION on the restored context.
      if (contextInvalidated || gl.isContextLost()) {
        return;
      }
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
    try {
      if (!program || !buffer) {
        throw new Error('WebGL resources unavailable');
      }
      gl.attachShader(program, makeShader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, makeShader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
      }
    } catch (error) {
      canvas.dataset.rendererStatus = 'shader-unavailable';
      canvas.dataset.rendererError =
        error instanceof Error ? error.message : 'WebGL initialization failed';
      release();
      readyRef.current?.(false);
      return;
    }

    delete canvas.dataset.rendererError;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolutionUniform = gl.getUniformLocation(program, 'uResolution');
    const lightUniform = gl.getUniformLocation(program, 'uLightY');
    const darkUniform = gl.getUniformLocation(program, 'uDark');
    const revealUniform = gl.getUniformLocation(program, 'uReveal');
    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const maxRenderbufferSize = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    const maxViewportDimensions = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | null;
    const maxWidth = Math.min(maxTextureSize, maxRenderbufferSize, maxViewportDimensions?.[0] ?? 0);
    const maxHeight = Math.min(
      maxTextureSize,
      maxRenderbufferSize,
      maxViewportDimensions?.[1] ?? 0,
    );
    const failRenderer = (message: string) => {
      renderFailed = true;
      ready = false;
      canvas.style.visibility = 'hidden';
      canvas.dataset.rendererStatus = 'render-unavailable';
      canvas.dataset.rendererError = message;
      readyRef.current?.(false);
    };

    const render = () => {
      frame = 0;
      if (disposed || renderFailed || (document.hidden && ready) || gl.isContextLost()) {
        return;
      }
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        return;
      }
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        1.5,
        maxWidth / bounds.width,
        maxHeight / bounds.height,
      );
      if (!Number.isFinite(ratio) || ratio <= 0) {
        failRenderer('WebGL drawing dimensions unavailable');
        return;
      }
      const nextWidth = Math.max(1, Math.floor(bounds.width * ratio));
      const nextHeight = Math.max(1, Math.floor(bounds.height * ratio));
      if (width !== nextWidth || height !== nextHeight) {
        width = nextWidth;
        height = nextHeight;
        canvas.width = width;
        canvas.height = height;
        if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) {
          failRenderer('WebGL drawing buffer allocation failed');
          return;
        }
        gl.viewport(0, 0, width, height);
      }
      lightY += (targetLightY - lightY) * 0.12;
      gl.uniform2f(resolutionUniform, bounds.width, bounds.height);
      gl.uniform1f(lightUniform, lightY);
      gl.uniform1f(darkUniform, modeRef.current === 'dark' ? 1 : 0);
      gl.uniform1f(revealUniform, revealRef.current?.get() ?? 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      const drawError = gl.getError();
      if (drawError !== gl.NO_ERROR) {
        failRenderer(`WebGL draw failed (0x${drawError.toString(16)})`);
        return;
      }
      if (!ready) {
        ready = true;
        canvas.dataset.rendererStatus = 'ready';
        canvas.style.visibility = 'visible';
        readyRef.current?.(true);
      }
      if (Math.abs(targetLightY - lightY) > 0.0001) {
        frame = window.requestAnimationFrame(render);
      }
    };
    const invalidate = () => {
      if (!frame && !disposed && !renderFailed) {
        frame = window.requestAnimationFrame(render);
      }
    };
    invalidateRef.current = invalidate;
    const pointerMove = (event: PointerEvent) => {
      if (
        revealRef.current ||
        modeRef.current === 'light' ||
        reducedMotion.matches ||
        event.pointerType === 'touch'
      ) {
        return;
      }
      const bounds = root.getBoundingClientRect();
      targetLightY = 0.96 + (0.5 - (event.clientY - bounds.top) / bounds.height) * 0.025;
      invalidate();
    };
    const pointerLeave = () => {
      targetLightY = 0.96;
      invalidate();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      contextInvalidated = true;
      ready = false;
      canvas.style.visibility = 'hidden';
      readyRef.current?.(false);
    };
    const contextRestored = () => setContextVersion((value) => value + 1);
    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(root);
    root.addEventListener('pointermove', pointerMove, { passive: true });
    root.addEventListener('pointerleave', pointerLeave);
    window.addEventListener('resize', invalidate);
    document.addEventListener('visibilitychange', invalidate);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    invalidate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      invalidateRef.current = null;
      resizeObserver.disconnect();
      root.removeEventListener('pointermove', pointerMove);
      root.removeEventListener('pointerleave', pointerLeave);
      window.removeEventListener('resize', invalidate);
      document.removeEventListener('visibilitychange', invalidate);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      release();
      readyRef.current?.(false);
    };
  }, [rootRef, contextVersion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="wall-lighting-canvas"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        visibility: 'hidden',
      }}
    />
  );
}
