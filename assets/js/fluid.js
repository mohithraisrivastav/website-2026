/**
 * fluid.js — Noise-based ink advection
 * FBM flow field drives all motion. No Navier-Stokes solver.
 * Real ink-in-water feel: wispy tendrils, variable opacity, dissolving edges.
 */
(function () {
    'use strict';

    /* ── Config ─────────────────────────────────────────────────────────── */
    var CFG = {
        DYE_RES: 512,
        DISS:    0.985,   /* 1.5%/frame — ink stays vivid for ~1.5s then snaps clear */
    };

    /* ── Canvas setup ───────────────────────────────────────────────────── */
    var canvas = document.createElement('canvas');
    canvas.id = 'fluid-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:fixed',
        'top:0', 'left:0',
        'width:100%', 'height:100%',
        'z-index:0',
        'pointer-events:none',
        'display:block',
    ].join(';');

    function insertCanvas() {
        var old = document.getElementById('liquid-bg');
        if (old) old.remove();
        document.body.insertBefore(canvas, document.body.firstChild);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertCanvas);
    } else {
        insertCanvas();
    }

    /* ── WebGL context ──────────────────────────────────────────────────── */
    var gl = canvas.getContext('webgl', {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
    });
    if (!gl) return;

    /* Extensions */
    var EXT_HALF      = gl.getExtension('OES_texture_half_float');
    var EXT_HALF_LIN  = gl.getExtension('OES_texture_half_float_linear');
    var EXT_FLOAT     = gl.getExtension('OES_texture_float');
    var EXT_FLOAT_LIN = gl.getExtension('OES_texture_float_linear');

    var HALF_TYPE = EXT_HALF ? EXT_HALF.HALF_FLOAT_OES : null;

    var TEX_TYPE, TEX_LINEAR;
    if (EXT_FLOAT && EXT_FLOAT_LIN) {
        TEX_TYPE = gl.FLOAT;    TEX_LINEAR = true;
    } else if (EXT_HALF && EXT_HALF_LIN) {
        TEX_TYPE = HALF_TYPE;   TEX_LINEAR = true;
    } else if (EXT_FLOAT) {
        TEX_TYPE = gl.FLOAT;    TEX_LINEAR = false;
    } else if (EXT_HALF) {
        TEX_TYPE = HALF_TYPE;   TEX_LINEAR = false;
    } else {
        TEX_TYPE = gl.UNSIGNED_BYTE; TEX_LINEAR = true;
    }

    /* ── GLSL sources ───────────────────────────────────────────────────── */
    var VS = [
        'attribute vec2 a;',
        'varying vec2 uv;',
        'uniform vec2 ts;',
        'void main(){',
        '  uv = a*0.5+0.5;',
        '  gl_Position = vec4(a,0.0,1.0);',
        '}',
    ].join('\n');

    /* ── Noise-advect shader ────────────────────────────────────────────── */
    /* Asymmetric FBM: X and Y use different scales, different time speeds,  */
    /* directional bias. Ink tears and stretches unevenly — not uniform.     */
    var FS_ADVECT_NOISE = [
        'precision highp float;',
        'uniform sampler2D u_dye;',
        'uniform float u_time;',
        'uniform float u_dt;',
        'uniform float u_diss;',
        'varying vec2 uv;',

        'vec2 hash22(vec2 p){',
        '  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));',
        '  return -1.0 + 2.0*fract(sin(p)*43758.5453123);',
        '}',

        'float gnoise(vec2 p){',
        '  vec2 i=floor(p), f=fract(p);',
        '  vec2 u=f*f*(3.0-2.0*f);',
        '  return mix(',
        '    mix(dot(hash22(i),           f          ),',
        '        dot(hash22(i+vec2(1,0)), f-vec2(1,0)), u.x),',
        '    mix(dot(hash22(i+vec2(0,1)), f-vec2(0,1)),',
        '        dot(hash22(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);',
        '}',

        'float fbm(vec2 p){',
        '  float v=0.0, a=0.5;',
        '  for(int i=0;i<4;i++){v+=a*gnoise(p); p=p*2.1+vec2(31.41,17.31); a*=0.5;}',
        '  return v;',
        '}',

        'void main(){',

        /* Coarse — X/Y use different spatial scales + very different time rates */
        '  float fx  = fbm(uv*2.5 + vec2(u_time*0.110, u_time*0.037));',
        '  float fy  = fbm(uv*3.1 + vec2(u_time*0.053, u_time*0.140) + vec2(5.71,1.82));',
        '  vec2 flow = vec2(fx, fy) * 1.26;',
        '  flow.x += 0.28;',  /* directional bias — rightward drift */

        /* Medium — swapped spatial scales, asymmetric phase offsets */
        '  float fx2 = fbm(uv*5.8 + vec2(u_time*0.310, u_time*0.130));',
        '  float fy2 = fbm(uv*8.2 + vec2(u_time*0.110, u_time*0.270) + vec2(2.34,7.61));',
        '  flow += vec2(fx2, fy2) * 0.49;',

        /* Fine — heavy asymmetry: X twice as fast as Y, different spatial freq */
        '  float fx3 = fbm(uv*14.0 + vec2(u_time*0.550, u_time*0.220));',
        '  float fy3 = fbm(uv*11.0 + vec2(u_time*0.180, u_time*0.630) + vec2(11.3,4.77));',
        '  flow += vec2(fx3, fy3) * 0.20;',

        '  vec2 prev = uv - flow * u_dt;',
        '  gl_FragColor = u_diss * texture2D(u_dye, prev);',
        '}',
    ].join('\n');

    /* ── Per-frame injection ────────────────────────────────────────────── */
    /* 6 compact anisotropic sources. A=200 → σ_along≈5% canvas,            */
    /* B=5000 → σ_perp≈1.4% canvas, aspect ~5:1.                            */
    /* injection=0.042 per source: with DISS=0.985 (rate=0.015/frame),       */
    /* average canvas density = 6×0.042×π/3162 / 0.015 ≈ 0.017 — well below */
    /* the display threshold of 0.22 → clean white background everywhere     */
    /* except tight source cores and their comet-tail flow-stretched tendrils.*/
    /* Sources span all quadrants at t=0 so no initial clustering.           */
    var FS_INJECT = [
        'precision highp float;',
        'uniform sampler2D u_dye;',
        'uniform float u_time;',
        'varying vec2 uv;',
        'void main(){',
        '  float dens = texture2D(u_dye, uv).r;',
        '  float ink = 0.0;',

        /* s1 — left-upper (t=0: ~0.18, 0.40) */
        '  vec2 c1=vec2(0.18+sin(u_time*0.14)*0.08, 0.28+cos(u_time*0.11)*0.12);',
        '  float a1=u_time*0.23+0.70; vec2 v1=uv-c1;',
        '  ink+=exp(-(v1.x*cos(a1)+v1.y*sin(a1))*(v1.x*cos(a1)+v1.y*sin(a1))*200.0',
        '           -(-v1.x*sin(a1)+v1.y*cos(a1))*(-v1.x*sin(a1)+v1.y*cos(a1))*5000.0)*0.042;',

        /* s2 — right-upper (t=0: ~0.72, 0.40) */
        '  vec2 c2=vec2(0.72+sin(u_time*0.12)*0.10, 0.32+cos(u_time*0.16)*0.08);',
        '  float a2=u_time*0.19+2.10; vec2 v2=uv-c2;',
        '  ink+=exp(-(v2.x*cos(a2)+v2.y*sin(a2))*(v2.x*cos(a2)+v2.y*sin(a2))*200.0',
        '           -(-v2.x*sin(a2)+v2.y*cos(a2))*(-v2.x*sin(a2)+v2.y*cos(a2))*5000.0)*0.042;',

        /* s3 — left-centre (t=0: ~0.20, 0.67) */
        '  vec2 c3=vec2(0.20+sin(u_time*0.09)*0.10, 0.55+cos(u_time*0.13)*0.12);',
        '  float a3=u_time*0.14+4.50; vec2 v3=uv-c3;',
        '  ink+=exp(-(v3.x*cos(a3)+v3.y*sin(a3))*(v3.x*cos(a3)+v3.y*sin(a3))*200.0',
        '           -(-v3.x*sin(a3)+v3.y*cos(a3))*(-v3.x*sin(a3)+v3.y*cos(a3))*5000.0)*0.042;',

        /* s4 — right-centre (t=0: ~0.75, 0.60) */
        '  vec2 c4=vec2(0.75+sin(u_time*0.15)*0.08, 0.50+cos(u_time*0.10)*0.10);',
        '  float a4=u_time*0.30+1.30; vec2 v4=uv-c4;',
        '  ink+=exp(-(v4.x*cos(a4)+v4.y*sin(a4))*(v4.x*cos(a4)+v4.y*sin(a4))*200.0',
        '           -(-v4.x*sin(a4)+v4.y*cos(a4))*(-v4.x*sin(a4)+v4.y*cos(a4))*5000.0)*0.042;',

        /* s5 — lower-centre (t=0: ~0.45, 0.86) */
        '  vec2 c5=vec2(0.45+sin(u_time*0.11)*0.12, 0.78+cos(u_time*0.18)*0.08);',
        '  float a5=u_time*0.11+3.80; vec2 v5=uv-c5;',
        '  ink+=exp(-(v5.x*cos(a5)+v5.y*sin(a5))*(v5.x*cos(a5)+v5.y*sin(a5))*200.0',
        '           -(-v5.x*sin(a5)+v5.y*cos(a5))*(-v5.x*sin(a5)+v5.y*cos(a5))*5000.0)*0.042;',

        /* s6 — upper-centre (t=0: ~0.40, 0.25) */
        '  vec2 c6=vec2(0.40+sin(u_time*0.08)*0.18, 0.15+cos(u_time*0.07)*0.10);',
        '  float a6=u_time*0.17+5.80; vec2 v6=uv-c6;',
        '  ink+=exp(-(v6.x*cos(a6)+v6.y*sin(a6))*(v6.x*cos(a6)+v6.y*sin(a6))*200.0',
        '           -(-v6.x*sin(a6)+v6.y*cos(a6))*(-v6.x*sin(a6)+v6.y*cos(a6))*5000.0)*0.042;',

        '  gl_FragColor=vec4(min(dens+ink,1.0),min(dens+ink,1.0),min(dens+ink,1.0),1.0);',
        '}',
    ].join('\n');

    /* ── Display shader ─────────────────────────────────────────────────── */
    /* No blur: direct sample keeps thin tendrils sharp rather than diluting  */
    /* them into low-density halos. Alpha uses pow(d,0.55) so mid-density     */
    /* strands read as vivid orange, not pale peach. Low-density clip (d<0.04)*/
    /* eliminates any residual pale wash from the off-screen flow.            */
    var FS_DISPLAY = [
        'precision highp float;',
        'uniform sampler2D u_dye;',
        'uniform vec2 ts;',
        'uniform float u_time;',
        'varying vec2 uv;',

        'vec2 hash22(vec2 p){',
        '  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));',
        '  return -1.0+2.0*fract(sin(p)*43758.5453123);',
        '}',
        'float gnoise(vec2 p){',
        '  vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);',
        '  return mix(mix(dot(hash22(i),f),dot(hash22(i+vec2(1,0)),f-vec2(1,0)),u.x),',
        '             mix(dot(hash22(i+vec2(0,1)),f-vec2(0,1)),dot(hash22(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);',
        '}',

        'void main(){',

        /* shimmer warp — display only, adds liquid distortion */
        '  vec2 w = vec2(',
        '    sin(uv.y*4.2+u_time*0.17)*0.008+sin(uv.y*9.5+u_time*0.38)*0.003,',
        '    cos(uv.x*3.8+u_time*0.14)*0.008+cos(uv.x*8.8+u_time*0.32)*0.003);',
        '  vec2 suv = uv + w;',

        /* direct sample — no blur, keeps tendril edges sharp */
        '  float d = clamp(texture2D(u_dye, suv).r, 0.0, 1.0);',

        /* noise fractures smooth gradients into organic ink texture */
        '  float brk = gnoise(uv*18.0 + vec2(u_time*0.31, u_time*0.47));',
        '  d = clamp(d * (0.85 + 0.15*brk), 0.0, 1.0);',

        /* 0→invisible below 0.06 (cuts background haze), 1→fully opaque at   */
        /* 0.55 (source cores read as vivid #FF8F0C). The 0.06–0.55 ramp     */
        /* shows tendrils fading to transparent — real ink-in-water taper.   */
        '  float alpha = smoothstep(0.22, 0.58, d);',
        '  vec3 ink = vec3(1.0, 0.557, 0.047);',
        '  gl_FragColor = vec4(ink, alpha);',
        '}',
    ].join('\n');

    /* ── Shader / program helpers ───────────────────────────────────────── */
    function compileShader(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(s));
        }
        return s;
    }

    var _vs = compileShader(gl.VERTEX_SHADER, VS);

    function makeProgram(fsSrc) {
        var fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
        var p  = gl.createProgram();
        gl.attachShader(p, _vs);
        gl.attachShader(p, fs);
        gl.bindAttribLocation(p, 0, 'a');
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(p));
        }
        gl.deleteShader(fs);

        var u = {};
        var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < n; i++) {
            var name = gl.getActiveUniform(p, i).name;
            u[name] = gl.getUniformLocation(p, name);
        }
        return { p: p, u: u };
    }

    /* ── Programs ───────────────────────────────────────────────────────── */
    var P = {
        advectNoise: makeProgram(FS_ADVECT_NOISE),
        inject:      makeProgram(FS_INJECT),
        display:     makeProgram(FS_DISPLAY),
    };

    /* ── Full-screen quad ───────────────────────────────────────────────── */
    var quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    function bindQuad() {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
    }

    /* ── Texture / FBO helpers ──────────────────────────────────────────── */
    function makeTex(w, h, internalFmt, fmt, type, filter) {
        gl.activeTexture(gl.TEXTURE0);
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFmt, w, h, 0, fmt, type, null);
        return t;
    }

    function makeFBO(w, h, internalFmt, fmt, type, filter) {
        var t  = makeTex(w, h, internalFmt, fmt, type, filter);
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                                gl.TEXTURE_2D, t, 0);
        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('FBO incomplete, status:', status);
        }
        return {
            tex: t,
            fb:  fb,
            w:   w,
            h:   h,
            texelX: 1.0 / w,
            texelY: 1.0 / h,
            attach: function (unit) {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, t);
                return unit;
            },
        };
    }

    function makeDoubleFBO(w, h, internalFmt, fmt, type, filter) {
        var a = makeFBO(w, h, internalFmt, fmt, type, filter);
        var b = makeFBO(w, h, internalFmt, fmt, type, filter);
        return {
            read:  a,
            write: b,
            swap: function () {
                var tmp = this.read;
                this.read  = this.write;
                this.write = tmp;
            },
        };
    }

    var LIN = TEX_LINEAR ? gl.LINEAR : gl.NEAREST;

    /* ── Simulation buffer — dye only, no velocity ──────────────────────── */
    var dyeW = CFG.DYE_RES, dyeH = CFG.DYE_RES;
    var dye = makeDoubleFBO(dyeW, dyeH, gl.RGBA, gl.RGBA, TEX_TYPE, LIN);

    /* ── Draw helpers ───────────────────────────────────────────────────── */
    function useProgram(prog) { gl.useProgram(prog.p); return prog.u; }

    function blit(target) {
        if (target == null) {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.w, target.h);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /* ── Resize ─────────────────────────────────────────────────────────── */
    function resize() {
        var W = Math.floor(window.innerWidth  * (window.devicePixelRatio || 1));
        var H = Math.floor(window.innerHeight * (window.devicePixelRatio || 1));
        if (canvas.width !== W || canvas.height !== H) {
            canvas.width  = W;
            canvas.height = H;
        }
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── Simulation step ────────────────────────────────────────────────── */
    function step(dt) {

        gl.disable(gl.BLEND);
        bindQuad();

        var dx = 1 / dyeW, dy_tex = 1 / dyeH;

        /* — Noise-advect: back-trace through FBM flow field — */
        var u = useProgram(P.advectNoise);
        gl.uniform2f(u['ts'], dx, dy_tex);
        gl.uniform1i(u['u_dye'],  dye.read.attach(0));
        gl.uniform1f(u['u_time'], _time);
        gl.uniform1f(u['u_dt'],   dt);
        gl.uniform1f(u['u_diss'], CFG.DISS);
        blit(dye.write);
        dye.swap();

        /* — Inject: add fresh ink at moving Gaussian sources — */
        u = useProgram(P.inject);
        gl.uniform2f(u['ts'], dx, dy_tex);
        gl.uniform1i(u['u_dye'],  dye.read.attach(0));
        gl.uniform1f(u['u_time'], _time);
        blit(dye.write);
        dye.swap();
    }

    /* ── Render to screen ───────────────────────────────────────────────── */
    function render() {
        /* Clear to transparent every frame — prevents stale buffer darkening */
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        var u = useProgram(P.display);
        gl.uniform2f(u['ts'], 1 / canvas.width, 1 / canvas.height);
        gl.uniform1i(u['u_dye'],  dye.read.attach(0));
        gl.uniform1f(u['u_time'], _time);
        bindQuad();
        blit(null);
    }

    /* ── Main loop ──────────────────────────────────────────────────────── */
    var lastT = 0;
    var _time = 0;
    function loop(t) {
        requestAnimationFrame(loop);
        if (!lastT) { lastT = t; return; }
        var dt = Math.min((t - lastT) / 1000, 0.016);
        lastT = t;
        _time += dt;
        bindQuad();
        step(dt);
        render();
    }
    requestAnimationFrame(loop);

    /* ── Warm-start: pre-simulate ~2 sec before first visible frame ─────── */
    /* Runs inject + advect 120× so canvas is filled on load rather than
       fading in from black.                                                 */
    setTimeout(function () {
        gl.disable(gl.BLEND);
        bindQuad();
        var dx = 1 / dyeW, dy_tex = 1 / dyeH;
        for (var i = 0; i < 90; i++) {
            var t_pre = i * 0.016;

            /* advect */
            var u = useProgram(P.advectNoise);
            gl.uniform2f(u['ts'], dx, dy_tex);
            gl.uniform1i(u['u_dye'],  dye.read.attach(0));
            gl.uniform1f(u['u_time'], t_pre);
            gl.uniform1f(u['u_dt'],   0.016);
            gl.uniform1f(u['u_diss'], CFG.DISS);
            blit(dye.write);
            dye.swap();

            /* inject */
            u = useProgram(P.inject);
            gl.uniform2f(u['ts'], dx, dy_tex);
            gl.uniform1i(u['u_dye'],  dye.read.attach(0));
            gl.uniform1f(u['u_time'], t_pre);
            blit(dye.write);
            dye.swap();
        }
    }, 80);

})();
