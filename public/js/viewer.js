import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {

    try {
        const urlParams = new URLSearchParams(window.location.search);
        // Default to a fallback if not provided, though the DB will dictate actual root scenes
        const initialScene = urlParams.get("scene") || "main";

        // Fetch all scenes from Firestore
        const querySnapshot = await getDocs(collection(db, "scenes"));
        const scenesData = {};

        querySnapshot.forEach((doc) => {
            scenesData[doc.id] = doc.data();
        });

        if (Object.keys(scenesData).length === 0) {
            console.warn("No scenes found in the database. Has the admin added any yet?");
            document.getElementById("loading-overlay").innerHTML = "<p>No scenes available. Please wait for an admin to add them.</p>";
            return;
        }

        // If 'main' doesn't exist anymore but they didn't pass a param, grab the first available key
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
                setTimeout(() => {
                    overlay.style.display = "none";
                }, 500);
            }
            updateTitle();
        });

        viewer.on("scenechange", updateTitle);

        function updateTitle() {
            const id = viewer.getScene();
            const title = document.getElementById("current-scene-title");
            if (scenesData[id]) {
                title.textContent = scenesData[id].title;
            }
        }

    } catch (error) {
        console.error("Viewer initialization failed:", error);
        document.getElementById("loading-overlay").innerHTML = `<p>Error loading viewer: ${error.message}</p>`;
    }

});