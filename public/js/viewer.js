import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const initialScene = urlParams.get("scene") || "main";

        // Fetch all scenes from Firestore
        const querySnapshot = await getDocs(collection(db, "scenes"));
        const scenesData = {};

        querySnapshot.forEach((doc) => {
            scenesData[doc.id] = doc.data();
        });

        if (Object.keys(scenesData).length === 0) {
            document.getElementById("loading-overlay").innerHTML = `
                <i class="fas fa-cube" style="font-size:2.5rem; color: var(--text-faint); margin-bottom:20px;"></i>
                <p>No scenes available yet.</p>`;
            return;
        }

        // Fallback to first available scene if requested one doesn't exist
        const startSceneId = scenesData[initialScene] ? initialScene : Object.keys(scenesData)[0];

        const scenesConfig = {
            default: {
                firstScene: startSceneId,
                sceneFadeDuration: 1000,
                autoLoad: true,
                compass: true,
                showFullscreenCtrl: true
            },
            scenes: scenesData
        };

        const viewer = pannellum.viewer("panorama", scenesConfig);

        viewer.on("load", () => {
            const overlay = document.getElementById("loading-overlay");
            if (overlay) {
                overlay.style.opacity = "0";
                setTimeout(() => { overlay.style.display = "none"; }, 700);
            }
            updateSceneUI();
        });

        viewer.on("scenechange", updateSceneUI);

        function updateSceneUI() {
            const id = viewer.getScene();
            const titleEl = document.getElementById("current-scene-title");
            const typeEl  = document.getElementById("current-scene-type");
            const scene   = scenesData[id];

            if (scene) {
                // Set title
                if (titleEl) titleEl.textContent = scene.title;

                // Set type badge
                if (typeEl) {
                    const typeMap = { building:'Building', department:'Department', classroom:'Classroom', lab:'Lab' };
                    typeEl.textContent = typeMap[scene.sceneType] || '360° View';
                }

                // Update browser tab title
                document.title = `${scene.title} – Vision 360`;
            }
        }

    } catch (error) {
        console.error("Viewer initialization failed:", error);
        document.getElementById("loading-overlay").innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size:2.5rem; color:#ff0844; margin-bottom:20px;"></i>
            <p style="color:#ff0844;">Error loading viewer</p>
            <small style="color: var(--text-faint);">${error.message}</small>`;
    }

});