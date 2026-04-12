(function () {
    /* ── Precargar fuente Cinzel Decorative para texturas del dado ── */
    (function precargarFuente() {
        if (document.querySelector('link[href*="Cinzel+Decorative"]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&display=swap";
        document.head.appendChild(link);
    })();

    function esc(texto) {
        return String(texto ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function normalizarNombre(valor) {
        return String(valor || "").trim().toLowerCase();
    }

    function formatoModificador(valor) {
        const numero = Number(valor || 0);
        return numero >= 0 ? `+${numero}` : `${numero}`;
    }

    /* ══════════════════════════════════════════════
       Generador de textura por cara (canvas)
    ══════════════════════════════════════════════ */
    function crearTexturaCaras(num) {
        const SZ = 512, cx = 256, cy = 256;
        const cv = document.createElement("canvas");
        cv.width = cv.height = SZ;
        const ctx = cv.getContext("2d");

        // Fondo rojo oscuro
        ctx.fillStyle = "#880c28";
        ctx.fillRect(0, 0, SZ, SZ);

        // Ruido sutil
        for (let n = 0; n < 1200; n++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.033})`;
            ctx.fillRect(Math.random() * SZ, Math.random() * SZ, 1.4, 1.4);
        }

        // Halo dorado
        const halo = ctx.createRadialGradient(cx, cy, SZ * 0.18, cx, cy, SZ * 0.47);
        halo.addColorStop(0, "rgba(175,105,22,.28)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, SZ * 0.47, 0, Math.PI * 2);
        ctx.fill();

        // Círculo interior oscuro
        ctx.beginPath();
        ctx.arc(cx, cy, SZ * 0.355, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(3,1,10,.91)";
        ctx.fill();

        // Borde dorado del círculo
        ctx.beginPath();
        ctx.arc(cx, cy, SZ * 0.355, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(205,155,32,.96)";
        ctx.lineWidth = SZ * 0.025;
        ctx.stroke();

        // Aro interior tenue
        ctx.beginPath();
        ctx.arc(cx, cy, SZ * 0.30, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,210,85,.18)";
        ctx.lineWidth = SZ * 0.008;
        ctx.stroke();

        // Puntos decorativos
        const dr = SZ * 0.33;
        for (let a = 0; a < 6; a++) {
            const ang = (a / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang) * dr, cy + Math.sin(ang) * dr, SZ * 0.013, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(205,160,38,.7)";
            ctx.fill();
        }

        // Número con gradiente dorado
        const fs = num >= 10 ? SZ * 0.355 : SZ * 0.42;
        ctx.font = `900 ${fs}px "Cinzel Decorative","Palatino","Times New Roman",serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(255,175,35,.78)";
        ctx.shadowBlur = SZ * 0.055;
        const tg = ctx.createLinearGradient(cx, cy - fs * 0.5, cx, cy + fs * 0.5);
        tg.addColorStop(0, "#fffab8");
        tg.addColorStop(0.38, "#f5cc40");
        tg.addColorStop(1, "#a85c0e");
        ctx.fillStyle = tg;
        ctx.fillText(String(num), cx, cy + SZ * 0.022);

        return cv;
    }

    /* ══════════════════════════════════════════════
       Visual 3D del dado (Three.js)
    ══════════════════════════════════════════════ */
    class VisualDado3D {
        constructor() {
            this.wrap = document.getElementById("dado-wrap");
            this.resultado = document.getElementById("dado-resultado");
            this.calc = document.getElementById("dado-calc");
            this.veredicto = document.getElementById("dado-veredicto");
            this.flotante = document.getElementById("dado-flotante");
            this.flash = document.getElementById("dado-flash");
            this.resultadoArea = this.resultado ? this.resultado.closest(".dado-resultado-area") : null;
            this.THREE = window.THREE || null;
            this.estado = "idle";
            this.resultadoFinal = null;
            this.tiempoMinimo = 0;
            this.destino = null;

            // Animaciones reactivas
            this.bumpActive = false; this.bumpStart = 0;
            this.jumpActive = false; this.jumpStart = 0;
            this.shakeActive = false; this.shakeStart = 0;
            this.arc = { x: 0, y: 0, sx: 1, sy: 1.3, sz: 0.7 };
            this.rollStart = 0;
            this.ROLL_DUR = 2.0;

            if (!this.wrap || !this.resultado || !this.calc || !this.veredicto) {
                return;
            }
            if (!this.THREE) {
                this.wrap.classList.add("is-fallback");
                return;
            }

            this._construirEscena();
            this.reloj = new this.THREE.Clock();
            window.addEventListener("resize", () => this.ajustarTamano());
            this.animar();

            // Regenerar texturas cuando la fuente Cinzel Decorative cargue
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => this._regenerarTexturas());
            }
        }

        _regenerarTexturas() {
            if (!this.faceMats || !this.THREE) return;
            for (let i = 0; i < this.faceMats.length; i++) {
                const canvas = crearTexturaCaras(i + 1);
                const tex = new this.THREE.CanvasTexture(canvas);
                tex.minFilter = this.THREE.LinearMipmapLinearFilter;
                tex.generateMipmaps = true;
                this.faceMats[i].map.dispose();
                this.faceMats[i].map = tex;
                this.faceMats[i].needsUpdate = true;
            }
        }

        _construirEscena() {
            const THREE = this.THREE;
            const ancho = this.wrap.clientWidth || 320;
            const alto = this.wrap.clientHeight || ancho;

            this.escena = new THREE.Scene();
            this.camara = new THREE.PerspectiveCamera(42, ancho / alto, 0.1, 100);
            this.camara.position.set(0, 0, 8);

            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.setSize(ancho, alto);
            this.renderer.setClearColor(0x000000, 0);
            this.wrap.appendChild(this.renderer.domElement);

            // Luces
            this.escena.add(new THREE.AmbientLight(0x8060b0, 0.52));
            const keyL = new THREE.DirectionalLight(0xfff8e8, 2.5);
            keyL.position.set(4, 6, 6); this.escena.add(keyL);
            const fillL = new THREE.DirectionalLight(0x3820a0, 0.9);
            fillL.position.set(-5, -2, 3); this.escena.add(fillL);
            const rimL = new THREE.DirectionalLight(0xff8830, 0.9);
            rimL.position.set(1, -7, -5); this.escena.add(rimL);
            const ptL = new THREE.PointLight(0xb090ff, 0.5, 22);
            ptL.position.set(0, 7, 3); this.escena.add(ptL);

            // Geometría con UVs por cara
            const origGeo = new THREE.IcosahedronGeometry(2, 0);
            const baseGeo = origGeo.toNonIndexed();
            const posAttr = baseGeo.attributes.position;
            const uvAttr = baseGeo.attributes.uv;
            const WORLD_UP = new THREE.Vector3(0, 1, 0);
            this.faceData = [];

            for (let i = 0; i < 20; i++) {
                const vi = i * 3;
                const verts = [0, 1, 2].map(k =>
                    new THREE.Vector3(posAttr.getX(vi + k), posAttr.getY(vi + k), posAttr.getZ(vi + k))
                );
                const center = new THREE.Vector3().add(verts[0]).add(verts[1]).add(verts[2]).divideScalar(3);
                const normal = center.clone().normalize();
                let tU = new THREE.Vector3().crossVectors(WORLD_UP, normal);
                if (tU.lengthSq() < 1e-6) tU.set(1, 0, 0);
                tU.normalize();
                const tV = new THREE.Vector3().crossVectors(normal, tU).normalize();
                const scale = Math.max(...verts.map(v => v.distanceTo(center))) * 1.18;
                verts.forEach((v, k) => {
                    const d = v.clone().sub(center);
                    uvAttr.setXY(vi + k, 0.5 + d.dot(tU) / (2 * scale), 0.5 + d.dot(tV) / (2 * scale));
                });
                baseGeo.addGroup(vi, 3, i);
                this.faceData.push({ number: i + 1, normalLocal: normal.clone(), tV: tV.clone() });
            }
            uvAttr.needsUpdate = true;

            // Materiales con texturas numeradas
            this.faceMats = this.faceData.map((_, i) => {
                const canvas = crearTexturaCaras(i + 1);
                const tex = new THREE.CanvasTexture(canvas);
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.generateMipmaps = true;
                return new THREE.MeshPhysicalMaterial({
                    map: tex,
                    color: 0xffffff,
                    roughness: 0.20,
                    metalness: 0.06,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.07,
                    reflectivity: 0.88,
                    emissive: new THREE.Color(0x1a0008),
                    emissiveIntensity: 0.24,
                });
            });

            // Grupo del dado
            this.grupo = new THREE.Group();
            this.escena.add(this.grupo);
            this.grupo.add(new THREE.Mesh(baseGeo, this.faceMats));
            this.grupo.add(new THREE.LineSegments(
                new THREE.EdgesGeometry(origGeo),
                new THREE.LineBasicMaterial({ color: 0xffe898, transparent: true, opacity: 0.80 })
            ));
            this.grupo.rotation.set(0.4, 0.5, 0.18);

            // Sombra
            const sombraCanvas = document.createElement("canvas");
            sombraCanvas.width = sombraCanvas.height = 256;
            const ctx = sombraCanvas.getContext("2d");
            const gr = ctx.createRadialGradient(128, 128, 8, 128, 128, 118);
            gr.addColorStop(0, "rgba(0,0,0,.55)");
            gr.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = gr;
            ctx.fillRect(0, 0, 256, 256);
            this.sombra = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: new THREE.CanvasTexture(sombraCanvas),
                    transparent: true, depthWrite: false,
                })
            );
            this.sombra.position.set(0, -2.75, -0.3);
            this.sombra.scale.set(5.2, 2, 1);
            this.escena.add(this.sombra);
        }

        ajustarTamano() {
            if (!this.renderer || !this.camara) return;
            const ancho = this.wrap.clientWidth || 320;
            const alto = this.wrap.clientHeight || ancho;
            this.camara.aspect = ancho / alto;
            this.camara.updateProjectionMatrix();
            this.renderer.setSize(ancho, alto);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }

        /* ── Helpers de emisión ── */
        _setEmissive(intensidad) {
            if (!this.faceMats) return;
            for (const m of this.faceMats) m.emissiveIntensity = intensidad;
        }
        _setEmissiveColor(hex) {
            if (!this.faceMats) return;
            for (const m of this.faceMats) m.emissive.setHex(hex);
        }
        fijarEmision(color, intensidad) {
            this._setEmissiveColor(color);
            this._setEmissive(intensidad);
        }

        /* ── Quaternion que orienta una cara hacia la cámara ── */
        getFaceQ(num) {
            const THREE = this.THREE;
            const fd = this.faceData.find(f => f.number === num);
            if (!fd) return this.grupo.quaternion.clone();
            const forward = new THREE.Vector3(0, 0, 1);
            const screenUp = new THREE.Vector3(0, 1, 0);
            const q1 = new THREE.Quaternion().setFromUnitVectors(fd.normalLocal.clone().normalize(), forward);
            const tVr = fd.tV.clone().applyQuaternion(q1);
            tVr.z = 0;
            if (tVr.lengthSq() < 1e-4) return q1;
            tVr.normalize();
            const q2 = new THREE.Quaternion().setFromUnitVectors(tVr, screenUp);
            return new THREE.Quaternion().multiplyQuaternions(q2, q1);
        }

        /* ── Chispas ── */
        spawnSparkles(count) {
            const area = this.resultadoArea || this.wrap;
            if (!area) return;
            const chars = ["✦", "✧", "★", "⬟", "◆"];
            for (let i = 0; i < count; i++) {
                const s = document.createElement("span");
                s.className = "dado-sparkle";
                s.textContent = chars[Math.floor(Math.random() * chars.length)];
                const tx = (Math.random() - 0.5) * 140;
                const ty = -(30 + Math.random() * 80);
                const tr = (Math.random() - 0.5) * 560;
                s.style.cssText = `left:${30 + Math.random() * 40}%;top:${15 + Math.random() * 50}%;color:hsl(${42 + Math.random() * 20},100%,${65 + Math.random() * 20}%);font-size:${9 + Math.random() * 12}px;animation-delay:${Math.random() * 0.3}s;animation-duration:${0.7 + Math.random() * 0.5}s;--tx:${tx}px;--ty:${ty}px;--tr:${tr}deg;`;
                area.appendChild(s);
                setTimeout(() => s.remove(), 1600);
            }
        }

        /* ── Flash de pantalla ── */
        triggerFlash(tipo) {
            if (!this.flash) return;
            this.flash.className = "dado-flash";
            void this.flash.offsetWidth;
            this.flash.className = `dado-flash ${tipo}`;
        }

        /* ── Texto flotante ── */
        showFloatingText(text, cls) {
            if (!this.flotante) return;
            this.flotante.textContent = text;
            this.flotante.className = "dado-flotante";
            void this.flotante.offsetWidth;
            this.flotante.className = `dado-flotante ${cls}`;
        }

        resetUI() {
            this.resultado.textContent = "D20";
            this.resultado.className = "dado-resultado";
            this.calc.innerHTML = "";
            this.veredicto.textContent = "";
            this.veredicto.className = "dado-veredicto";
            if (this.flotante) {
                this.flotante.textContent = "";
                this.flotante.className = "dado-flotante";
            }
            if (this.flash) {
                this.flash.className = "dado-flash";
            }
        }

        reset() {
            this.estado = "idle";
            this.resultadoFinal = null;
            this.tiempoMinimo = 0;
            this.destino = null;
            this.bumpActive = false;
            this.jumpActive = false;
            this.shakeActive = false;
            this.resetUI();
            this.fijarEmision(0x1a0008, 0.22);
        }

        iniciarLanzamiento() {
            this.resetUI();
            this.resultado.textContent = "...";
            this.resultado.className = "dado-resultado is-rolling";
            this.estado = "rolling";
            this.bumpActive = false;
            this.jumpActive = false;
            this.shakeActive = false;
            // Trayectoria de arco aleatoria
            this.arc = {
                x: (Math.random() - 0.5) * 2.8,
                y: 0.55 + Math.random() * 1.05,
                sx: (Math.random() > 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.35),
                sy: (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.35),
                sz: (Math.random() > 0.5 ? 1 : -1) * (0.65 + Math.random() * 0.25),
            };
            if (this.reloj) this.rollStart = this.reloj.getElapsedTime();
            this.tiempoMinimo = performance.now() + 900;
            this.fijarEmision(0x1a0008, 0.32);
        }

        mostrarResultado(tirada) {
            this.resultadoFinal = tirada;
            if (!this.THREE || !this.grupo) {
                this.renderizarResultadoFinal(tirada);
                return;
            }
            if (this.estado !== "rolling" && this.estado !== "settling") {
                this.iniciarLanzamiento();
            }
        }

        /* ── Animación del modificador contando ── */
        _animateModifier(dieRoll, mod, dc, onDone) {
            const absSteps = Math.abs(mod);
            const sign = mod >= 0 ? 1 : -1;
            const stepMs = Math.max(110, 180 - absSteps * 5);
            if (absSteps === 0) { onDone(dieRoll); return; }

            this.resultado.textContent = dieRoll;
            this.resultado.className = "dado-resultado";

            let cur = dieRoll, rem = mod, step = 0;
            const iv = setInterval(() => {
                cur += sign; rem -= sign; step++;
                this.resultado.classList.remove("is-tick");
                void this.resultado.offsetWidth;
                this.resultado.textContent = cur;
                this.resultado.classList.add("is-tick");
                if (step >= absSteps) {
                    clearInterval(iv);
                    setTimeout(() => onDone(cur), 300);
                }
            }, stepMs);
        }

        /* ── Resultado normal ── */
        _finishNormal(total, dieRoll, mod, dc, exito) {
            this.resultado.classList.remove("is-tick");
            this.resultado.textContent = total;
            this.resultado.className = `dado-resultado ${exito ? "is-exito" : "is-fallo"}`;
            if (exito) {
                this.resultado.classList.add("is-won");
            } else {
                this.resultado.classList.add("is-lost");
            }

            if (mod !== 0) {
                const signTxt = mod > 0 ? "+" : "−";
                const abs = Math.abs(mod);
                const cls = mod > 0 ? "mod-pos" : "mod-neg";
                this.calc.innerHTML = `${esc(dieRoll)} <span class="${cls}">${signTxt}${abs}</span> = <strong>${esc(total)}</strong> / DC ${esc(dc)}`;
            } else {
                this.calc.innerHTML = `<strong>${esc(total)}</strong> / DC ${esc(dc)}`;
            }

            this.veredicto.textContent = exito ? "✓  Superado" : "✗  Fallado";
            this.veredicto.className = `dado-veredicto is-show ${exito ? "is-exito" : "is-fallo"}`;

            if (exito) {
                this.jumpActive = true;
                if (this.reloj) this.jumpStart = this.reloj.getElapsedTime();
                this.fijarEmision(0x102808, 0.26);
                this.spawnSparkles(10);
            } else {
                this.bumpActive = true;
                if (this.reloj) this.bumpStart = this.reloj.getElapsedTime();
                this.fijarEmision(0x1e0000, 0.26);
            }
        }

        /* ── Crítico (20 natural) ── */
        _handleCritical(dc) {
            this.showFloatingText("Crítico", "is-visible is-critico");
            this.triggerFlash("flash-gold");
            this.fijarEmision(0x281500, 0.28);
            this.jumpActive = true;
            if (this.reloj) this.jumpStart = this.reloj.getElapsedTime();

            setTimeout(() => {
                this.resultado.textContent = "20";
                this.resultado.className = "dado-resultado is-critico is-critical-pop";
                this.calc.innerHTML = `d20 <span class="nat20">natural 20</span> — <span class="total">victoria automática</span>`;
                this.veredicto.textContent = "✓  Superado";
                this.veredicto.className = "dado-veredicto is-show is-exito";
                this.spawnSparkles(18);
            }, 700);
        }

        /* ── Desastre (1 natural) ── */
        _handleDisaster(dc) {
            this.showFloatingText("Desastre", "is-visible is-desastre");
            this.triggerFlash("flash-crimson");
            this.fijarEmision(0x280000, 0.28);
            this.shakeActive = true;
            if (this.reloj) this.shakeStart = this.reloj.getElapsedTime();
            this.bumpActive = false;

            setTimeout(() => {
                this.resultado.textContent = "1";
                this.resultado.className = "dado-resultado is-desastre is-disaster-pop";
                this.calc.innerHTML = `d20 <span class="nat1">natural 1</span> — <span style="color:rgba(220,80,80,.8)">derrota automática</span>`;
                this.veredicto.textContent = "✗  Fallado";
                this.veredicto.className = "dado-veredicto is-show is-fallo";
                setTimeout(() => {
                    this.bumpActive = true;
                    if (this.reloj) this.bumpStart = this.reloj.getElapsedTime();
                }, 450);
            }, 700);
        }

        renderizarResultadoFinal(tirada) {
            if (!tirada) return;

            const dado = Number(tirada.resultado_dado ?? 0);
            const mod = Number(tirada.modificador ?? 0);
            const total = Number(tirada.total ?? 0);
            const dc = Number(tirada.dc ?? 0);
            const exito = !!tirada.exito;

            // Mostrar el número del dado primero
            this.resultado.textContent = dado;
            this.resultado.className = "dado-resultado";

            if (tirada.critico) {
                setTimeout(() => this._handleCritical(dc), 350);
            } else if (tirada.desastre) {
                setTimeout(() => this._handleDisaster(dc), 350);
            } else {
                setTimeout(() => {
                    this._animateModifier(dado, mod, dc, (finalNum) => {
                        this._finishNormal(finalNum, dado, mod, dc, exito);
                    });
                }, 380);
            }
        }

        _estimarMsHastaRenderFinal() {
            if (!this.reloj || !this.THREE || !this.grupo) {
                return 0;
            }

            const ahora = this.reloj.getElapsedTime();
            if (this.estado === "rolling") {
                const restante = Math.max(0, (this.ROLL_DUR - (ahora - this.rollStart)) * 1000);
                return restante + 550;
            }

            if (this.estado === "settling") {
                return 550;
            }

            return 0;
        }

        _estimarMsAnimacionResultado(tirada) {
            if (!tirada) {
                return 0;
            }

            if (tirada.critico) {
                return 1500;
            }

            if (tirada.desastre) {
                return 1450;
            }

            const pasos = Math.abs(Number(tirada.modificador ?? 0));
            const stepMs = Math.max(110, 180 - pasos * 5);
            const conteoMs = pasos === 0 ? 380 : 380 + (pasos * stepMs) + 300;
            const remateMs = tirada.exito ? 700 : 550;
            return conteoMs + remateMs;
        }

        estimarMsAntesDeContinuar(tirada, esperaExtraMs = 3000) {
            const esperaExtra = Math.max(0, Number(esperaExtraMs) || 0);
            return this._estimarMsHastaRenderFinal() + this._estimarMsAnimacionResultado(tirada) + esperaExtra;
        }

        animar() {
            requestAnimationFrame(() => this.animar());
            if (!this.renderer || !this.escena || !this.camara || !this.grupo) return;
            const t = this.reloj.getElapsedTime();

            switch (this.estado) {
                case "idle": {
                    this.grupo.rotation.x += 0.005;
                    this.grupo.rotation.y += 0.0076;
                    this.grupo.rotation.z += 0.0033;
                    this.grupo.position.y = Math.sin(t * 1.55) * 0.09;
                    this.sombra.material.opacity = 0.26 - Math.sin(t * 1.55) * 0.04;
                    this._setEmissive(0.24 + Math.sin(t * 2.1) * 0.04);
                    break;
                }
                case "rolling": {
                    const p = Math.min((t - this.rollStart) / this.ROLL_DUR, 1.0);
                    if (p < 1.0) {
                        const env = Math.sin(p * Math.PI);
                        this.grupo.position.x = this.arc.x * env;
                        this.grupo.position.y = this.arc.y * env + Math.sin(p * Math.PI * 3) * 0.22 * (1 - p);
                        const sp = 0.38 * Math.pow(1 - p, 0.4);
                        this.grupo.rotation.x += sp * this.arc.sx;
                        this.grupo.rotation.y += sp * this.arc.sy;
                        this.grupo.rotation.z += sp * this.arc.sz;
                        this.sombra.material.opacity = 0.16 + env * 0.12;
                        this._setEmissive(0.24 + env * 0.22);
                    } else {
                        this.grupo.position.set(0, 0, 0);
                        this.grupo.rotation.y += 0.010;
                        this.sombra.material.opacity = 0.24;
                        if (this.resultadoFinal) {
                            this.destino = this.getFaceQ(this.resultadoFinal.resultado_dado);
                            this.estado = "settling";
                        }
                    }
                    break;
                }
                case "settling": {
                    if (this.destino) {
                        this.grupo.quaternion.slerp(this.destino, 0.10);
                        this.grupo.position.x *= 0.88;
                        this.grupo.position.y *= 0.88;
                        this.sombra.material.opacity = 0.26;
                        this._setEmissive(0.26);
                        if (this.grupo.quaternion.angleTo(this.destino) < 0.005) {
                            this.grupo.quaternion.copy(this.destino);
                            this.grupo.position.set(0, 0, 0);
                            this.estado = "settled";
                            this.renderizarResultadoFinal(this.resultadoFinal);
                        }
                    }
                    break;
                }
                case "settled": {
                    const baseY = Math.sin(t * 1.3) * 0.024;
                    if (this.shakeActive) {
                        const bt = t - this.shakeStart;
                        if (bt < 0.7) {
                            const amp = (1 - bt / 0.7) * 0.18;
                            this.grupo.position.x = Math.sin(bt * 52) * amp;
                            this.grupo.position.y = baseY + Math.sin(bt * 48) * amp * 0.4;
                        } else {
                            this.shakeActive = false;
                            this.grupo.position.set(0, baseY, 0);
                        }
                    } else if (this.jumpActive) {
                        const bt = t - this.jumpStart;
                        if (bt < 0.65) {
                            this.grupo.position.y = baseY + Math.sin(bt / 0.65 * Math.PI) * 0.65;
                        } else {
                            this.jumpActive = false;
                            this.grupo.position.y = baseY;
                        }
                    } else if (this.bumpActive) {
                        const bt = t - this.bumpStart;
                        if (bt < 0.5) {
                            this.grupo.position.y = -Math.sin(bt / 0.5 * Math.PI) * 0.7;
                        } else {
                            this.bumpActive = false;
                            this.grupo.position.y = baseY;
                        }
                    } else {
                        this.grupo.position.y = baseY;
                    }
                    this.sombra.material.opacity = 0.25 - Math.sin(t * 1.3) * 0.02;
                    this._setEmissive(0.25 + Math.sin(t * 1.8) * 0.055);
                    break;
                }
            }
            this.renderer.render(this.escena, this.camara);
        }
    }

    /* ══════════════════════════════════════════════
       Controlador público
    ══════════════════════════════════════════════ */
    window.crearControladorDado3D = function crearControladorDado3D(config) {
        const modal = document.getElementById("modal-dado");
        const subtitulo = document.getElementById("dado-subtitulo");
        const actor = document.getElementById("dado-actor");
        const control = document.getElementById("dado-control");
        const atributo = document.getElementById("dado-atributo");
        const habilidad = document.getElementById("dado-habilidad");
        const dc = document.getElementById("dado-dc");
        const modificador = document.getElementById("dado-modificador");
        const motivo = document.getElementById("dado-motivo");
        const estado = document.getElementById("dado-estado");
        const boton = document.getElementById("btn-lanzar-dado");
        const botonOmitir = document.getElementById("btn-omitir-animacion");
        const visual = new VisualDado3D();
        const ESPERA_EXTRA_RESULTADO_MS = 3000;
        const CIERRE_RESERVA_MS = 2500;
        let tiradaActual = null;
        let solicitudEnviada = false;
        let continuacionSolicitada = false;
        let resultadoMostradoId = "";
        let continuarTimer = null;
        let cierreTimer = null;

        function limpiarCierre() {
            if (cierreTimer) {
                window.clearTimeout(cierreTimer);
                cierreTimer = null;
            }
        }

        function limpiarContinuacion() {
            if (continuarTimer) {
                window.clearTimeout(continuarTimer);
                continuarTimer = null;
            }
        }

        function limpiarTemporizadores() {
            limpiarContinuacion();
            limpiarCierre();
        }

        function actualizarBotonOmitir({ visible = false, disabled = false, texto = "Omitir animacion" } = {}) {
            if (!botonOmitir) {
                return;
            }
            botonOmitir.hidden = !visible;
            botonOmitir.disabled = !visible || disabled;
            botonOmitir.textContent = texto;
        }

        function reiniciarResultadoProgramado() {
            limpiarTemporizadores();
            continuacionSolicitada = false;
            resultadoMostradoId = "";
            actualizarBotonOmitir();
        }

        function buscarActor(actorId) {
            return typeof config?.resolverActor === "function" ? config.resolverActor(actorId) : null;
        }

        function nombreAutorizado(tirada) {
            if (tirada?.jugador_autorizado) {
                return String(tirada.jugador_autorizado);
            }
            const actorTirada = buscarActor(tirada?.actor_id);
            return String(actorTirada?.jugador_nombre || actorTirada?.nombre || "");
        }

        function puedeLanzar(tirada) {
            if (!tirada || tirada.resultado_dado != null || tirada.control !== "jugador" || solicitudEnviada) {
                return false;
            }
            const autorizado = normalizarNombre(nombreAutorizado(tirada));
            return autorizado && autorizado === normalizarNombre(config?.nombreJugador) && config?.getSocketAbierto?.();
        }

        function programarCierreDeReserva() {
            limpiarCierre();
            cierreTimer = window.setTimeout(cerrarModal, CIERRE_RESERVA_MS);
        }

        function solicitarContinuacion() {
            if (!tiradaActual || tiradaActual.resultado_dado == null || continuacionSolicitada) {
                return;
            }

            continuacionSolicitada = true;
            limpiarContinuacion();
            actualizarBotonOmitir({
                visible: true,
                disabled: true,
                texto: "Continuando..."
            });
            estado.textContent = "Continuando la escena...";
            config?.enviarContinuacionTirada?.(tiradaActual.id);
            programarCierreDeReserva();
        }

        function programarContinuacionAutomatica(tirada) {
            limpiarContinuacion();
            const esperaMs = Math.max(
                ESPERA_EXTRA_RESULTADO_MS,
                visual.estimarMsAntesDeContinuar(tirada, ESPERA_EXTRA_RESULTADO_MS)
            );
            continuarTimer = window.setTimeout(() => {
                solicitarContinuacion();
            }, esperaMs);
        }

        function cerrarModal() {
            reiniciarResultadoProgramado();
            tiradaActual = null;
            solicitudEnviada = false;
            modal.hidden = true;
            visual.reset();
        }

        function refrescarVista() {
            if (!tiradaActual) {
                cerrarModal();
                return;
            }
            modal.hidden = false;
            subtitulo.textContent = tiradaActual.resultado_dado != null
                ? "Resultado compartido con toda la sala."
                : "Toda la sala ve esta tirada en tiempo real.";
            actor.textContent = tiradaActual.actor_nombre || "--";
            control.textContent = tiradaActual.control === "ia" ? "IA" : "Jugador";
            atributo.textContent = tiradaActual.atributo || "--";
            habilidad.textContent = tiradaActual.habilidad || "--";
            dc.textContent = String(tiradaActual.dc ?? "--");
            modificador.textContent = formatoModificador(tiradaActual.modificador ?? 0);
            motivo.textContent = tiradaActual.motivo || "--";

            if (tiradaActual.resultado_dado != null) {
                boton.hidden = true;
                boton.disabled = true;
                solicitudEnviada = false;
                actualizarBotonOmitir({
                    visible: true,
                    disabled: continuacionSolicitada,
                    texto: continuacionSolicitada ? "Continuando..." : "Omitir animacion"
                });
                estado.textContent = continuacionSolicitada
                    ? "Continuando la escena..."
                    : `Resultado final: ${tiradaActual.total ?? tiradaActual.resultado_dado}. Mostrando animacion antes de continuar.`;

                if (resultadoMostradoId !== String(tiradaActual.id || "")) {
                    reiniciarResultadoProgramado();
                    resultadoMostradoId = String(tiradaActual.id || "");
                    visual.mostrarResultado(tiradaActual);
                    programarContinuacionAutomatica(tiradaActual);
                    actualizarBotonOmitir({
                        visible: true,
                        disabled: false,
                        texto: "Omitir animacion"
                    });
                }
                return;
            }

            actualizarBotonOmitir();

            if (tiradaActual.control === "ia") {
                boton.hidden = true;
                boton.disabled = true;
                estado.textContent = "Raphael resuelve esta tirada de forma automatica.";
                visual.iniciarLanzamiento();
                return;
            }

            boton.hidden = false;
            boton.disabled = !puedeLanzar(tiradaActual);
            boton.textContent = solicitudEnviada ? "Lanzando..." : "Lanzar dado";
            if (puedeLanzar(tiradaActual)) {
                estado.textContent = "Es tu tirada. Pulsa el boton para lanzar.";
            } else if (solicitudEnviada) {
                estado.textContent = "El servidor esta resolviendo la tirada.";
                visual.iniciarLanzamiento();
            } else {
                estado.textContent = `Esperando a ${nombreAutorizado(tiradaActual) || "otro jugador"}.`;
                visual.reset();
            }
        }

        boton?.addEventListener("click", () => {
            if (!puedeLanzar(tiradaActual)) return;
            solicitudEnviada = true;
            visual.iniciarLanzamiento();
            refrescarVista();
            config?.enviarLanzamiento?.();
        });

        botonOmitir?.addEventListener("click", () => {
            solicitarContinuacion();
        });

        return {
            actualizarCombate(combate) {
                const tirada = combate?.tirada_pendiente || null;
                if (!tirada) {
                    if (!tiradaActual || tiradaActual.resultado_dado == null || continuacionSolicitada) {
                        cerrarModal();
                    }
                    return;
                }
                if (tiradaActual && tiradaActual.id !== tirada.id) {
                    solicitudEnviada = false;
                    reiniciarResultadoProgramado();
                }
                tiradaActual = { ...tirada };
                refrescarVista();
            },
            manejarTiradaSolicitada(payload) {
                const tirada = { ...(payload?.tirada || payload || {}) };
                solicitudEnviada = false;
                if (!tiradaActual || tiradaActual.id !== tirada.id) {
                    reiniciarResultadoProgramado();
                }
                tiradaActual = tirada;
                refrescarVista();
            },
            manejarTiradaResuelta(payload) {
                const tirada = { ...(payload?.tirada || payload || {}) };
                if (!tiradaActual || tiradaActual.id !== tirada.id) {
                    reiniciarResultadoProgramado();
                } else {
                    limpiarCierre();
                }
                tiradaActual = tirada;
                refrescarVista();
            },
            manejarTiradaCancelada(payload) {
                const tiradaId = String(payload?.tirada_id || "");
                if (!tiradaActual || !tiradaId || tiradaActual.id === tiradaId) {
                    cerrarModal();
                }
            },
        };
    };
})();
