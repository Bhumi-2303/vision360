import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {

    // ── Type helpers ──────────────────────────────────────────────
    const knownTypes  = new Set(['building', 'department', 'classroom', 'lab']);
    const typeLabels  = { building: 'Main Campus', department: 'Department', classroom: 'Classroom', lab: 'Lab' };
    const typeIcons   = { building: '🏫', department: '🏛️', classroom: '🚪', lab: '🔬' };
    const typeColors  = { building: 'var(--c-primary)', department: 'var(--c-secondary)', classroom: '#a78bfa', lab: '#f093fb' };

    function inferType(s) {
        const raw = (s.sceneType || '').toLowerCase().trim();
        if (knownTypes.has(raw)) return raw;
        const t = (s.title || '').toLowerCase();
        if (t.includes('campus') || t.includes('main'))                  return 'building';
        if (t.includes('department') || t.includes('dept'))              return 'department';
        if (t.includes('lab') || t.includes('laboratory'))               return 'lab';
        if (t.includes('room') || t.includes('class') || t.includes('hall')) return 'classroom';
        return 'building';
    }

    // ── State ──────────────────────────────────────────────────────
    let VIEWER           = null;
    let scenesData       = {};
    let isTourPlaying    = false;
    let rotationFrameReq = null;
    let autoTourTimer    = null;
    let isAutoNavigating = false;
    let autoTourHistory  = [];
    let orderedAutoTour  = [];
    let currentSceneIndex = 0;
    let aiVoiceEnabled   = false;
    let currentSpeech    = null;

    // ── Element refs ───────────────────────────────────────────────
    const overlay    = document.getElementById("loading-overlay");
    const progressBar= document.getElementById("load-progress-bar");
    const titleEl    = document.getElementById("current-scene-title");
    const typeEl     = document.getElementById("current-scene-type");
    const breadEl    = document.getElementById("viewer-breadcrumb");
    const panel      = document.getElementById("scenes-panel");
    const panelList  = document.getElementById("panel-scene-list");
    const toggleBtn  = document.getElementById("toggle-panel-btn");
    const fsBtn      = document.getElementById("btn-fullscreen");
    const ziBtn      = document.getElementById("btn-zoom-in");
    const zoBtn      = document.getElementById("btn-zoom-out");
    const resetBtn   = document.getElementById("btn-reset");
    const autoBtn    = document.getElementById("btn-auto-rotate");
    const infoModal  = document.getElementById("hotspot-info-modal");
    const modalClose = document.getElementById("modal-close-btn");
    const infoPanel  = document.getElementById("scene-info-panel");
    const aiVoiceBtn = document.getElementById("btn-ai-voice");

    // ── Progress bar ───────────────────────────────────────────────
    function startProgress() {
        if (!progressBar) return null;
        let w = 0;
        progressBar.style.width = '0%'; progressBar.style.opacity = '1';
        const iv = setInterval(() => { w = Math.min(w + Math.random() * 8, 85); progressBar.style.width = w + '%'; }, 120);
        return iv;
    }
    function finishProgress(iv) {
        if (!progressBar) return;
        clearInterval(iv);
        progressBar.style.width = '100%';
        setTimeout(() => { progressBar.style.opacity = '0'; }, 400);
    }

    // ── AI Voice Guide ─────────────────────────────────────────────
    function stopAIVoice() {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
    function playAIVoice(text) {
        stopAIVoice();
        if (!aiVoiceEnabled || !window.speechSynthesis) return;
        currentSpeech = new SpeechSynthesisUtterance(text);
        currentSpeech.rate = 1.0;
        currentSpeech.pitch = 1.1;
        const voices = window.speechSynthesis.getVoices();
        const niceVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural"));
        if (niceVoice) currentSpeech.voice = niceVoice;
        window.speechSynthesis.speak(currentSpeech);
    }
    function speakCurrentScene() {
        if (!aiVoiceEnabled) return;
        const id = VIEWER.getScene();
        const scene = scenesData[id];
        if (!scene) return;
        let text = `Welcome to \${scene.title}.`;
        if (scene.description) text += ` \${scene.description}`;
        else text += ` This is a \${typeLabels[scene.sceneType]} space.`;
        playAIVoice(text);
    }

    if (aiVoiceBtn) {
        aiVoiceBtn.addEventListener('click', () => {
            aiVoiceEnabled = !aiVoiceEnabled;
            if (aiVoiceEnabled) {
                aiVoiceBtn.classList.add('active');
                aiVoiceBtn.setAttribute('data-tip', 'Voice Guide: ON (V)');
                aiVoiceBtn.style.color = '#f093fb';
                speakCurrentScene();
            } else {
                aiVoiceBtn.classList.remove('active');
                aiVoiceBtn.setAttribute('data-tip', 'Voice Guide: OFF (V)');
                aiVoiceBtn.style.color = '';
                stopAIVoice();
            }
        });
    }

    try {
        const urlParams    = new URLSearchParams(window.location.search);
        const initialScene = urlParams.get("scene");

        const loadIv = startProgress();

        // Fetch all scenes
        const snap = await getDocs(collection(db, "scenes"));
        snap.forEach(doc => {
            const d = doc.data();
            d.id = doc.id;
            d.sceneType = inferType(d);
            scenesData[doc.id] = d;
        });

        if (Object.keys(scenesData).length === 0) {
            overlay.innerHTML = `<i class="fas fa-cube" style="font-size:2.5rem;color:var(--text-faint);margin-bottom:20px;"></i><p>No scenes available yet.</p>`;
            finishProgress(loadIv);
            return;
        }

        // Build hierarchy immediately to ensure we have a valid sequence to fall back to
        buildOrderedHierarchy();

        // ── Process scenes — filter out invalid and attach handlers ──
        const CLOUDINARY_BASE = "https://res.cloudinary.com/dyysldt1m/image/upload/f_auto,q_auto/vision360/";
        
        const processed = {};
        Object.entries(scenesData).forEach(([id, scene]) => {
            if (!scene.panorama || scene.panorama.trim() === '') return;

            const s = { ...scene };
            
            // Auto-transform local paths to Cloudinary
            if (s.panorama.startsWith('images/') || s.panorama.startsWith('/images/')) {
                const filename = s.panorama.split('/').pop().replace(/\.[^/.]+$/, ""); // get name without ext
                s.panorama = `${CLOUDINARY_BASE}${filename}`;
            }

            if (s.initialPitch !== undefined) s.pitch = s.initialPitch;
            if (s.initialYaw !== undefined) s.yaw = s.initialYaw;
            
            if (s.hotSpots) {
                s.hotSpots = s.hotSpots.map(hs => {
                    if (hs.type === 'info') {
                        return { ...hs, cssClass: 'hs-custom-info', clickHandlerFunc: '__showInfoModal', clickHandlerArgs: { ...hs } };
                    }
                    return hs;
                });
            }
            processed[id] = s;
        });

        const processedIds = Object.keys(processed);
        if (processedIds.length === 0) {
            overlay.innerHTML = `<i class="fas fa-cube" style="font-size:2.5rem;color:var(--text-faint);margin-bottom:20px;"></i><p>No valid panoramas found.</p>`;
            finishProgress(loadIv);
            return;
        }

        // Safe fallback: try URL param first, then the top of our safe hierarchy, then first available
        let startId = (initialScene && processed[initialScene]) ? initialScene : null;
        if (!startId) {
            startId = orderedAutoTour.find(id => processed[id]) || processedIds[0];
        }

        // ── Init Pannellum ──────────────────────────────────────────
        VIEWER = pannellum.viewer("panorama", {
            default: { firstScene: startId, sceneFadeDuration: 1000, autoLoad: true, compass: false, showFullscreenCtrl: false, showZoomCtrl: false, mouseZoom: true, touchZoom: true, hfov: 100 },
            scenes: processed
        });

        // Safety timeout: hide overlay if it takes more than 15s
        const safetyTimeout = setTimeout(() => {
            if (overlay && overlay.style.display !== 'none') {
                finishProgress(loadIv);
                overlay.style.opacity = "0";
                setTimeout(() => { overlay.style.display = "none"; }, 700);
                console.warn("Viewer loading timed out. Forcing overlay hide.");
            }
        }, 15000);

        VIEWER.on("error", (msg) => {
            clearTimeout(safetyTimeout);
            finishProgress(loadIv);
            console.error("Pannellum Error:", msg);
            if (overlay) {
                overlay.innerHTML = `
                    <i class="fas fa-exclamation-circle" style="font-size:2.5rem;color:#ff4b2b;margin-bottom:20px;"></i>
                    <p style="color:#ff4b2b;font-weight:600;">Unable to load panorama</p>
                    <small style="color:var(--text-faint);max-width:240px;display:block;">${msg}</small>
                    <button onclick="location.reload()" style="margin-top:20px;padding:8px 16px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;border-radius:8px;cursor:pointer;">Retry</button>
                `;
            }
        });

        let isInitialViewerLoad = true;
        VIEWER.on("load", () => {
            clearTimeout(safetyTimeout);
            finishProgress(loadIv);
            if (overlay) { overlay.style.opacity = "0"; setTimeout(() => { overlay.style.display = "none"; }, 700); }
            updateSceneUI();
            updateInfoPanel();
            preloadAdjacent(VIEWER.getScene());
            
            if (sessionStorage.getItem('ira_welcome') === 'true') {
                sessionStorage.removeItem('ira_welcome');
                if (window.speechSynthesis) {
                    setTimeout(() => {
                        window.speechSynthesis.cancel();
                        const u1 = new SpeechSynthesisUtterance("Hey, I am IRA.");
                        u1.rate = 1.0; u1.pitch = 1.1;
                        const u2 = new SpeechSynthesisUtterance("Welcome to R.N.G.P.I.T.");
                        u2.rate = 1.0; u2.pitch = 1.1;
                        const voices = window.speechSynthesis.getVoices();
                        const niceVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural"));
                        if (niceVoice) { u1.voice = niceVoice; u2.voice = niceVoice; }
                        window.speechSynthesis.speak(u1);
                        window.speechSynthesis.speak(u2);
                    }, 500);
                }
            }
            
            // Auto start tour if parameter is present
            if (isInitialViewerLoad && urlParams.get("auto") === "true") {
                isInitialViewerLoad = false;
                if (orderedAutoTour.length === 0) buildOrderedHierarchy();
                const startHierarchalId = orderedAutoTour[0];
                
                if (VIEWER.getScene() !== startHierarchalId && startHierarchalId) {
                    isAutoNavigating = true; // Mark as auto so scenechange resets the timer properly
                    startAutoRotate();
                    VIEWER.loadScene(startHierarchalId);
                } else {
                    isAutoNavigating = true; 
                    startAutoRotate();
                    isAutoNavigating = false; 
                }
            }
        });

        VIEWER.on("scenechange", (id) => {
            if (orderedAutoTour.length > 0) {
                currentSceneIndex = orderedAutoTour.indexOf(id);
            }
            updateSceneUI();
            updateInfoPanel();
            refreshPanelHighlight();
            preloadAdjacent(id);
            if (isAutoNavigating) {
                // This change was triggered by the AutoTour timer
                isAutoNavigating = false;
                if (isTourPlaying) {
                    resetAutoTourTimer();
                }
            } else {
                // This change was likely manual (hotspot click or panel selection)
                // We stop the auto-tour to give control back to the user
                if (isTourPlaying) {
                    stopAutoRotate();
                }
            }
            speakCurrentScene();
        });

        document.getElementById("panorama").addEventListener("mousedown",  () => stopAutoRotate());
        document.getElementById("panorama").addEventListener("touchstart", () => stopAutoRotate());

        window.__v360viewer = VIEWER;

        // ── Scene info UI ───────────────────────────────────────────
        function updateSceneUI() {
            const id    = VIEWER.getScene();
            const scene = scenesData[id];
            if (!scene) return;
            if (titleEl) titleEl.textContent = scene.title;
            if (typeEl) {
                typeEl.textContent = `${typeIcons[scene.sceneType] || '🌐'} ${typeLabels[scene.sceneType] || '360°'}`;
                typeEl.style.color = typeColors[scene.sceneType] || 'var(--c-primary)';
            }
            if (breadEl) {
                let crumbs = `<a href="index.html">Home</a><span class="sep">›</span>`;
                if (scene.parentId && scenesData[scene.parentId]) {
                    const p = scenesData[scene.parentId];
                    crumbs += `<span style="cursor:pointer;" onclick="window.__v360viewer.loadScene('${scene.parentId}')">${p.title}</span><span class="sep">›</span>`;
                }
                crumbs += `<span style="color:var(--text-main);">${scene.title}</span>`;
                breadEl.innerHTML = crumbs;
            }
            document.title = `${scene.title} – Vision 360`;
        }

        // ── Floating scene info panel ───────────────────────────────
        function updateInfoPanel() {
            if (!infoPanel) return;
            const id    = VIEWER.getScene();
            const scene = scenesData[id];
            if (!scene) return;

            const col   = typeColors[scene.sceneType] || 'var(--c-primary)';
            const label = typeLabels[scene.sceneType] || 'Scene';
            const icon  = typeIcons[scene.sceneType]  || '🌐';
            const hsCount = (scene.hotSpots || []).length;
            const navCount= (scene.hotSpots || []).filter(h => h.type === 'scene').length;
            const desc  = scene.description || 'No description available. Edit this scene in the Admin Dashboard to add details.';

            // Parent scene name for breadcrumb
            const parentName = (scene.parentId && scenesData[scene.parentId]) ? scenesData[scene.parentId].title : null;

            infoPanel.querySelector('#ip-icon').textContent = icon;
            infoPanel.querySelector('#ip-type').textContent = label;
            infoPanel.querySelector('#ip-type').style.color = col;
            infoPanel.querySelector('#ip-title').textContent = scene.title;
            infoPanel.querySelector('#ip-parent').textContent = parentName ? `📍 ${parentName}` : '📍 Main Campus';
            infoPanel.querySelector('#ip-desc').textContent  = desc;
            infoPanel.querySelector('#ip-hs-count').textContent = hsCount;
            infoPanel.querySelector('#ip-nav-count').textContent = navCount;
            infoPanel.querySelector('#ip-info-count').textContent = hsCount - navCount;
        }

        // ── Preload adjacent scenes ─────────────────────────────────
        function preloadAdjacent(id) {
            const scene = scenesData[id];
            if (!scene?.hotSpots) return;
            scene.hotSpots.forEach(hs => {
                if (hs.type === 'scene' && hs.sceneId && scenesData[hs.sceneId]) {
                    const p = scenesData[hs.sceneId].panorama;
                    if (p) { const img = new Image(); img.src = p; }
                }
            });
        }

        // ── Info hotspot modal ──────────────────────────────────────
        function showInfoModal(hs) {
            if (!infoModal) return;
            document.getElementById('modal-hs-title').textContent = hs.text || 'Info';
            document.getElementById('modal-hs-desc').innerHTML = (hs.description || 'No description provided.').replace(/\n/g, '<br>');
            const imgWrap = document.getElementById('modal-hs-img-wrap');
            const imgEl   = document.getElementById('modal-hs-img');
            if (hs.imageUrl) { imgEl.src = hs.imageUrl; imgWrap.style.display = 'block'; }
            else imgWrap.style.display = 'none';
            infoModal.classList.add('open');
            stopAutoRotate();
            
            if (aiVoiceEnabled && hs.description) {
                playAIVoice(`${hs.text || 'Information'}: ${hs.description}`);
            }
        }
        
        // Export to window so Pannellum's string-based clickHandlerFunc can find it
        window.__showInfoModal = function(e, args) { showInfoModal(args); };

        modalClose && modalClose.addEventListener('click', () => infoModal && infoModal.classList.remove('open'));
        infoModal  && infoModal.addEventListener('click', (e) => { if (e.target === infoModal) infoModal.classList.remove('open'); });

        // ── Scenes panel ────────────────────────────────────────────
        function buildScenesPanel() {
            if (!panelList) return;
            const typeOrder = { building: 1, department: 2, classroom: 3, lab: 4 };
            const sorted = Object.entries(scenesData).sort(([,a],[,b]) => {
                return (typeOrder[a.sceneType]||5) - (typeOrder[b.sceneType]||5) || (a.title||'').localeCompare(b.title||'');
            });
            panelList.innerHTML = '';
            sorted.forEach(([id, scene]) => {
                const item = document.createElement('div');
                item.className = 'panel-scene-item';
                item.dataset.id = id;
                item.innerHTML = `<div class="panel-scene-dot"></div><div class="panel-scene-name">${scene.title}</div><div class="panel-scene-badge" style="color:${typeColors[scene.sceneType]||'var(--text-faint)'};">${typeLabels[scene.sceneType]||'Scene'}</div>`;
                item.addEventListener('click', () => { VIEWER.loadScene(id); if (window.innerWidth <= 768) panel && panel.classList.remove('open'); });
                panelList.appendChild(item);
            });
        }

        function refreshPanelHighlight() {
            const cur = VIEWER.getScene();
            document.querySelectorAll('.panel-scene-item').forEach(el => el.classList.toggle('current', el.dataset.id === cur));
        }

        buildScenesPanel();

        // ── Panel toggle ────────────────────────────────────────────
        toggleBtn && toggleBtn.addEventListener('click', () => { panel && panel.classList.toggle('open'); toggleBtn.classList.toggle('active'); });

        // ── Info panel toggle ───────────────────────────────────────
        const infoPanelBtn = document.getElementById('btn-info-panel');
        infoPanelBtn && infoPanelBtn.addEventListener('click', () => {
            infoPanel && infoPanel.classList.toggle('open');
            infoPanelBtn.classList.toggle('active');
        });

        // ── VR Mode Toggle ──────────────────────────────────────────
        const vrBtn = document.getElementById('btn-vr-mode');
        if (vrBtn) {
            vrBtn.addEventListener('click', () => {
                const currentId = VIEWER.getScene();
                const scene = processed[currentId];
                if (scene && scene.panorama) {
                    const vrUrl = `vr.html?img=${encodeURIComponent(scene.panorama)}&title=${encodeURIComponent(scene.title)}`;
                    window.location.href = vrUrl;
                }
            });
        }

        // ── Fullscreen ──────────────────────────────────────────────
        fsBtn && fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
                fsBtn.innerHTML = '<i class="fas fa-compress"></i>'; fsBtn.classList.add('active');
            } else {
                document.exitFullscreen && document.exitFullscreen();
                fsBtn.innerHTML = '<i class="fas fa-expand"></i>'; fsBtn.classList.remove('active');
            }
        });
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && fsBtn) { fsBtn.innerHTML = '<i class="fas fa-expand"></i>'; fsBtn.classList.remove('active'); }
        });

        // ── Zoom / Reset ────────────────────────────────────────────
        ziBtn    && ziBtn.addEventListener('click',    () => VIEWER.setHfov(Math.max(VIEWER.getHfov() - 15, 30)));
        zoBtn    && zoBtn.addEventListener('click',    () => VIEWER.setHfov(Math.min(VIEWER.getHfov() + 15, 120)));
        resetBtn && resetBtn.addEventListener('click', () => { VIEWER.setHfov(100); VIEWER.setPitch(0); VIEWER.setYaw(0); });

        // orderedAutoTour is declared at the top of the scope (line ~31)

        function buildOrderedHierarchy() {
            orderedAutoTour = [];
            const typeWeight = { building: 1, department: 2, classroom: 3, lab: 4 };

            // Only consider scenes that actually have an image uploaded
            const validScenes = Object.values(scenesData).filter(s => s.panorama && s.panorama.trim() !== '');

            // Find root scenes (buildings or those without parents)
            let roots = validScenes.filter(s => s.sceneType === 'building' || !s.parentId);
            
            // Sort roots by strict semantic weight
            roots.sort((a, b) => {
                const aTitle = (a.title || '').toLowerCase();
                const bTitle = (b.title || '').toLowerCase();
                const aIsMain = aTitle.includes('campus') || aTitle.includes('main');
                const bIsMain = bTitle.includes('campus') || bTitle.includes('main');
                if (aIsMain && !bIsMain) return -1;
                if (!aIsMain && bIsMain) return 1;

                const weightA = typeWeight[a.sceneType] || 5;
                const weightB = typeWeight[b.sceneType] || 5;
                if (weightA !== weightB) return weightA - weightB;

                return (a.title || '').localeCompare(b.title || '');
            });
            
            // DFS to add children
            function addDependencies(parentId) {
                let children = validScenes.filter(s => s.parentId === parentId);
                
                // Sort children by hierarchy weight
                children.sort((a, b) => {
                    const weightA = typeWeight[a.sceneType] || 5;
                    const weightB = typeWeight[b.sceneType] || 5;
                    if (weightA !== weightB) return weightA - weightB;
                    return (a.title || '').localeCompare(b.title || '');
                });

                children.forEach(c => {
                    if (!orderedAutoTour.includes(c.id)) {
                        orderedAutoTour.push(c.id);
                        addDependencies(c.id); // Add grandchildren
                    }
                });
            }

            roots.forEach(root => {
                if (!orderedAutoTour.includes(root.id)) {
                    orderedAutoTour.push(root.id);
                    addDependencies(root.id);
                }
            });

            // Append any disconnected scenes just in case, sorted by hierarchy too
            let leftovers = validScenes.filter(s => !orderedAutoTour.includes(s.id));
            leftovers.sort((a, b) => {
                const weightA = typeWeight[a.sceneType] || 5;
                const weightB = typeWeight[b.sceneType] || 5;
                if (weightA !== weightB) return weightA - weightB;
                return (a.title || '').localeCompare(b.title || '');
            });
            leftovers.forEach(s => orderedAutoTour.push(s.id));
        }

        // ── Auto-rotate & Auto-Tour Manager ─────────────────────────
        let autoTourStartTime = 0;
        let autoTourDuration = 10000; // 10 seconds per scene
        let progressFrameReq = null;
        let rotationSpeed = 0.15; // configurable rotation speed
        let lastRotationTime = 0; // for smooth rotation
        
        const autoProgressContainer = document.getElementById('autotour-progress-container');
        const autoProgressBar = document.getElementById('autotour-progress-bar');

        function updateAutoTourProgress() {
            if (!isTourPlaying) return;
            const elapsed = Date.now() - autoTourStartTime;
            const percentage = Math.min((elapsed / autoTourDuration) * 100, 100);
            
            if (autoProgressBar) {
                autoProgressBar.style.width = percentage + '%';
            }

            if (percentage < 100) {
                progressFrameReq = requestAnimationFrame(updateAutoTourProgress);
            }
        }

        function autoNavigateHierarchy() {
            if (!isTourPlaying || !VIEWER || isAutoNavigating) return;
            const curId = VIEWER.getScene();
            
            if (orderedAutoTour.length === 0) buildOrderedHierarchy();

            let curIdx = orderedAutoTour.indexOf(curId);
            let nextIdx = (curIdx + 1) % orderedAutoTour.length;
            currentSceneIndex = nextIdx; // State management
            
            const nextSceneId = orderedAutoTour[nextIdx];
            if (!nextSceneId || !processed[nextSceneId]) {
                stopAutoRotate();
                return;
            }

            // Preload the scene AFTER the next one for extra smoothness
            const lookAheadIdx = (nextIdx + 1) % orderedAutoTour.length;
            const lookAheadId = orderedAutoTour[lookAheadIdx];
            if (lookAheadId && processed[lookAheadId]) {
                const img = new Image();
                img.src = processed[lookAheadId].panorama;
            }

            isAutoNavigating = true;
            VIEWER.loadScene(nextSceneId);
        }

        function rotateStep(time) {
            if (!isTourPlaying) return;
            
            if (lastRotationTime === 0) lastRotationTime = time;
            const delta = time - lastRotationTime;
            lastRotationTime = time;
            
            if (VIEWER && !isAutoNavigating) {
                // Frame rate independent smooth rotation
                const speedMultiplier = delta / 16.666; // Normalize to ~60fps
                VIEWER.setYaw(VIEWER.getYaw() + (rotationSpeed * speedMultiplier));
            }
            rotationFrameReq = requestAnimationFrame(rotateStep);
        }

        function startAutoRotate() {
            if (isTourPlaying) return;
            isTourPlaying = true;
            
            if (autoBtn) { 
                autoBtn.classList.add('active'); 
                autoBtn.setAttribute('data-tip','Stop Auto Tour'); 
            }
            if (autoProgressContainer) autoProgressContainer.style.display = 'block';
            
            // Start smooth rotation
            cancelAnimationFrame(rotationFrameReq);
            lastRotationTime = performance.now();
            rotationFrameReq = requestAnimationFrame(rotateStep);

            resetAutoTourTimer();
        }

        function resetAutoTourTimer() {
            clearTimeout(autoTourTimer);
            cancelAnimationFrame(progressFrameReq);
            
            autoTourStartTime = Date.now();
            updateAutoTourProgress();
            
            autoTourTimer = setTimeout(autoNavigateHierarchy, autoTourDuration);
        }

        function stopAutoRotate() {
            if (!isTourPlaying) return;
            isTourPlaying = false;
            
            cancelAnimationFrame(rotationFrameReq);
            clearTimeout(autoTourTimer);
            cancelAnimationFrame(progressFrameReq);

            if (autoBtn) { 
                autoBtn.classList.remove('active'); 
                autoBtn.setAttribute('data-tip','Auto-Tour (A)'); 
            }
            if (autoProgressContainer) autoProgressContainer.style.display = 'none';
            if (autoProgressBar) autoProgressBar.style.width = '0%';
        }
        autoBtn && autoBtn.addEventListener('click', () => isTourPlaying ? stopAutoRotate() : startAutoRotate());

        // Pause auto mode when tab is inactive
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (isTourPlaying) {
                    window.__wasAutoRotatingBeforeHide = true;
                    stopAutoRotate();
                }
            } else {
                if (window.__wasAutoRotatingBeforeHide) {
                    window.__wasAutoRotatingBeforeHide = false;
                    startAutoRotate();
                }
            }
        });

        // ── Keyboard ────────────────────────────────────────────────
        document.addEventListener('keydown', (e) => {
            if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
            switch(e.key) {
                case 'ArrowUp':    e.preventDefault(); VIEWER.setPitch(VIEWER.getPitch() + 10); break;
                case 'ArrowDown':  e.preventDefault(); VIEWER.setPitch(VIEWER.getPitch() - 10); break;
                case 'ArrowLeft':  e.preventDefault(); VIEWER.setYaw(VIEWER.getYaw() - 15);    break;
                case 'ArrowRight': e.preventDefault(); VIEWER.setYaw(VIEWER.getYaw() + 15);    break;
                case '+': case '=': VIEWER.setHfov(Math.max(VIEWER.getHfov() - 10, 30));  break;
                case '-':           VIEWER.setHfov(Math.min(VIEWER.getHfov() + 10, 120)); break;
                case 'f': case 'F': fsBtn   && fsBtn.click();    break;
                case 'r': case 'R': resetBtn && resetBtn.click(); break;
                case 'a': case 'A': autoBtn  && autoBtn.click();  break;
                case 's': case 'S': toggleBtn && toggleBtn.click(); break;
                case 'i': case 'I': infoPanelBtn && infoPanelBtn.click(); break;
                case 'v': case 'V': aiVoiceBtn && aiVoiceBtn.click(); break;
                case 'Escape':
                    panel   && panel.classList.remove('open');
                    infoPanel && infoPanel.classList.remove('open');
                    infoModal && infoModal.classList.remove('open');
                    break;
            }
        });

    } catch (error) {
        console.error("Viewer initialization failed:", error);
        overlay && (overlay.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size:2.5rem;color:#ff0844;margin-bottom:20px;"></i>
            <p style="color:#ff0844;">Error loading viewer</p>
            <small style="color:var(--text-faint);">${error.message}</small>`);
    }
});