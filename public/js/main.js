import { fetchScenes } from "./scene-api.js";
import { SceneUI } from "./scene-ui.js";

document.addEventListener("DOMContentLoaded", async () => {
    const ui = new SceneUI();
    try {
        const scenes = await fetchScenes();
        ui.init(scenes);
    } catch (err) {
        ui.showError(err);
    }

    // ERA AI Guide - Navigation logic only (speech moved to centralized speakERA function)
    const exploreButtons = document.querySelectorAll('a[href="#campuses"]');
    exploreButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("Explore button clicked. (Speech logic disabled in main.js - handled by ERA system)");
            // Old speechSynthesis code removed to prevent conflicts
        });
    });
});
