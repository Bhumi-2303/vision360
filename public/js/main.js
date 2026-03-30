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
});
