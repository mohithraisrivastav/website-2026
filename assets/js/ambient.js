/**
 * ambient.js — Per-page synthetic ambient sound engine
 *
 * Signal chain per room:
 *   NoiseBuffer (looping) → HighPass (remove sub-rumble)
 *                         → LowPass  (remove harsh hiss)
 *                         → Gain shaper
 *                         → MasterGain (fade in/out)
 *                         → Destination
 *
 *   + Sine drone (barely audible sub tone) → MasterGain
 *
 * Default: OFF — user must opt in via the speaker button.
 * Preference saved: localStorage key "ambient" = "on" | "off"
 */

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════════════
       ROOM CONFIGS
       hpFreq : highpass cutoff  — removes low rumble, defines "floor" of the room
       lpFreq : lowpass cutoff   — removes hiss, defines "ceiling" / brightness
       drone  : sine oscillator Hz — felt room tone (keep audible: 80-200 Hz)
       dVol   : drone gain (keep subtle, 0.003-0.008)
       vol    : master gain (0.08-0.22 — audible but not intrusive)
       noise  : 'pink' (balanced) | 'brown' (darker, warmer)
    ═══════════════════════════════════════════════════════════════════════ */
    var ROOMS = {
        'index'    : { noise:'pink',  hpFreq:120,  lpFreq:3500, drone:110, dVol:0.005, vol:0.14, label:'Open Landscape'  },
        'about'    : { noise:'pink',  hpFreq:160,  lpFreq:2200, drone:130, dVol:0.004, vol:0.11, label:'Studio'          },
        'work'     : { noise:'brown', hpFreq:90,   lpFreq:1600, drone:95,  dVol:0.006, vol:0.13, label:'Gallery Hall'    },
        'shop'     : { noise:'pink',  hpFreq:200,  lpFreq:1200, drone:155, dVol:0.003, vol:0.09, label:'Edition Room'    },
        'film'     : { noise:'brown', hpFreq:70,   lpFreq:900,  drone:82,  dVol:0.007, vol:0.15, label:'Projection Room' },
        'blog'     : { noise:'pink',  hpFreq:220,  lpFreq:1800, drone:140, dVol:0.003, vol:0.09, label:'Reading Room'    },
        'essay'    : { noise:'pink',  hpFreq:210,  lpFreq:1700, drone:138, dVol:0.003, vol:0.08, label:'Reading Room'    },
        'workshops': { noise:'pink',  hpFreq:100,  lpFreq:5000, drone:105, dVol:0.004, vol:0.13, label:'Field'           },
        'contact'  : { noise:'pink',  hpFreq:200,  lpFreq:2000, drone:165, dVol:0.003, vol:0.09, label:'Reception'       },
        'checkout' : { noise:'pink',  hpFreq:190,  lpFreq:1900, drone:160, dVol:0.003, vol:0.08, label:'Reception'       },
        'project'  : { noise:'brown', hpFreq:110,  lpFreq:2000, drone:100, dVol:0.005, vol:0.12, label:'Site'            },
        'default'  : { noise:'pink',  hpFreq:150,  lpFreq:2500, drone:120, dVol:0.004, vol:0.11, label:'Room'            }
    };

    /* ── Detect current page key ─────────────────────────────────────────── */
    function getPageKey() {
        var p = (window.location.pathname || '').toLowerCase();
        if (!p || p === '/' || /index\.html$/.test(p) || /\/$/.test(p)) return 'index';
        if (/about/.test(p))                              return 'about';
        if (/\/work\.html/.test(p) || /\/work$/.test(p)) return 'work';
        if (/film/.test(p))                               return 'film';
        if (/blog/.test(p))                               return 'blog';
        if (/essay/.test(p))                              return 'essay';
        if (/workshop/.test(p))                           return 'workshops';
        if (/shop/.test(p))                               return 'shop';
        if (/contact/.test(p))                            return 'contact';
        if (/checkout|order/.test(p))                     return 'checkout';
        if (/project|eleve/.test(p))                      return 'project';
        return 'default';
    }

    var room      = ROOMS[getPageKey()] || ROOMS['default'];
    var ctx       = null;
    var master    = null;
    var isRunning = false;
    var isEnabled = localStorage.getItem('ambient') === 'on';

    /* ── Generate noise AudioBuffer ─────────────────────────────────────── */
    function buildNoiseBuffer(audioCtx, type) {
        var rate = audioCtx.sampleRate;
        var len  = rate * 8;          /* 8-second loop */
        var buf  = audioCtx.createBuffer(1, len, rate);
        var d    = buf.getChannelData(0);

        if (type === 'pink') {
            /* Paul Kellet's approximation */
            var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
            for (var i = 0; i < len; i++) {
                var w = Math.random() * 2 - 1;
                b0 = 0.99886*b0 + w*0.0555179;
                b1 = 0.99332*b1 + w*0.0750759;
                b2 = 0.96900*b2 + w*0.1538520;
                b3 = 0.86650*b3 + w*0.3104856;
                b4 = 0.55000*b4 + w*0.5329522;
                b5 = -0.7616*b5 - w*0.0168980;
                d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
                b6 = w * 0.115926;
            }
        } else {
            /* Brown noise: integrated white noise, normalise to ±0.8 */
            var lastOut = 0;
            for (var j = 0; j < len; j++) {
                var wh = Math.random() * 2 - 1;
                lastOut = (lastOut + (0.02 * wh)) / 1.02;
                d[j] = lastOut * 8.0;   /* amplify to useful range */
                d[j] = Math.max(-1, Math.min(1, d[j]));
            }
        }
        return buf;
    }

    /* ── Build and start the audio graph ────────────────────────────────── */
    function startAudio() {
        if (isRunning) return;

        try {
            ctx    = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.gain.setValueAtTime(0, ctx.currentTime);
            master.connect(ctx.destination);

            /* — Noise source — */
            var noiseSrc = ctx.createBufferSource();
            noiseSrc.buffer = buildNoiseBuffer(ctx, room.noise);
            noiseSrc.loop   = true;

            /* — Bandpass shaping: HP then LP — */
            var hp = ctx.createBiquadFilter();
            hp.type            = 'highpass';
            hp.frequency.value = room.hpFreq;
            hp.Q.value         = 0.7;

            var lp = ctx.createBiquadFilter();
            lp.type            = 'lowpass';
            lp.frequency.value = room.lpFreq;
            lp.Q.value         = 0.5;

            /* — Sub-drone sine oscillator — */
            var osc = ctx.createOscillator();
            osc.type            = 'sine';
            osc.frequency.value = room.drone;

            var oscGain = ctx.createGain();
            oscGain.gain.value = room.dVol;

            /* — Wire graph — */
            noiseSrc.connect(hp);
            hp.connect(lp);
            lp.connect(master);

            osc.connect(oscGain);
            oscGain.connect(master);

            /* — Start sources — */
            noiseSrc.start(0);
            osc.start(0);

            /* — Fade in over 3 s — */
            master.gain.linearRampToValueAtTime(room.vol, ctx.currentTime + 3.0);

            isRunning = true;
        } catch (e) {
            console.warn('ambient.js: AudioContext failed —', e);
        }
    }

    /* ── Fade out & suspend ──────────────────────────────────────────────── */
    function fadeOut() {
        if (!isRunning || !master || !ctx) return;
        var now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0, now + 1.8);
        setTimeout(function () {
            try { ctx.suspend(); } catch (e) {}
            isRunning = false;
        }, 2000);
    }

    /* ── Fade in (resume existing context or start fresh) ───────────────── */
    function fadeIn() {
        if (!ctx) {
            startAudio();
            return;
        }
        if (ctx.state === 'suspended') {
            ctx.resume().then(function () {
                isRunning = true;
                var now = ctx.currentTime;
                master.gain.cancelScheduledValues(now);
                master.gain.setValueAtTime(0, now);
                master.gain.linearRampToValueAtTime(room.vol, now + 2.5);
            });
        } else if (!isRunning) {
            startAudio();
        }
    }

    /* ── Toggle ──────────────────────────────────────────────────────────── */
    function handleToggle() {
        isEnabled = !isEnabled;
        localStorage.setItem('ambient', isEnabled ? 'on' : 'off');
        isEnabled ? fadeIn() : fadeOut();
        syncBtn();
    }

    /* ── Icons ───────────────────────────────────────────────────────────── */
    var SVG_ON =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"' +
        ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
        '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
        '</svg>';

    var SVG_OFF =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"' +
        ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
        '<line x1="23" y1="9" x2="17" y2="15"/>' +
        '<line x1="17" y1="9" x2="23" y2="15"/>' +
        '</svg>';

    var ambBtn = null;

    function syncBtn() {
        if (!ambBtn) return;
        ambBtn.innerHTML        = isEnabled ? SVG_ON : SVG_OFF;
        var onLbl  = 'Ambient: ' + room.label + ' — click to mute';
        var offLbl = 'Ambient: off — click to enter ' + room.label;
        ambBtn.setAttribute('title',       isEnabled ? onLbl : offLbl);
        ambBtn.setAttribute('aria-label',  isEnabled ? onLbl : offLbl);
        ambBtn.setAttribute('data-ambient', isEnabled ? 'on' : 'off');
    }

    /* ── Inject button into navbar ───────────────────────────────────────── */
    function injectBtn() {
        if (document.getElementById('ambient-toggle')) return;

        ambBtn = document.createElement('button');
        ambBtn.id = 'ambient-toggle';
        syncBtn();
        ambBtn.addEventListener('click', handleToggle);

        var themeBtn  = document.getElementById('theme-toggle');
        var container = document.querySelector('.nav-links-container');
        var navbar    = document.querySelector('.navbar');

        if (themeBtn && themeBtn.parentNode) {
            themeBtn.parentNode.insertBefore(ambBtn, themeBtn);
        } else if (container) {
            var ham = container.querySelector('.hamburger');
            container.insertBefore(ambBtn, ham || null);
        } else if (navbar) {
            navbar.appendChild(ambBtn);
        }

        /*
         * If user had ambient ON from a previous page, we cannot auto-start —
         * browsers require a user gesture. Instead we show a pulsing indicator
         * and start on the next interaction anywhere on the page.
         */
        if (isEnabled) {
            ambBtn.classList.add('ambient-pending');
            var startOnce = function () {
                ambBtn.classList.remove('ambient-pending');
                startAudio();
                document.removeEventListener('click',     startOnce);
                document.removeEventListener('keydown',   startOnce);
                document.removeEventListener('touchstart',startOnce);
            };
            /* If the context is already unlocked (e.g. same-page navigation), start now */
            try {
                var testCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (testCtx.state === 'running') {
                    testCtx.close();
                    startAudio();
                } else {
                    testCtx.close();
                    document.addEventListener('click',      startOnce, { once: true });
                    document.addEventListener('keydown',    startOnce, { once: true });
                    document.addEventListener('touchstart', startOnce, { once: true, passive: true });
                }
            } catch(e) {
                document.addEventListener('click',      startOnce, { once: true });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBtn);
    } else {
        injectBtn();
    }

})();
