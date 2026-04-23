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

    // IRA AI Guide - Speak on exploring
    const exploreButtons = document.querySelectorAll('a[href="#campuses"]');
    exploreButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("Explore button clicked, attempting to speak...");
            if (!window.speechSynthesis) {
                console.warn("speechSynthesis API not available in this browser.");
                return;
            }
            
            setTimeout(() => {
                window.speechSynthesis.cancel();
                
                const utterance1 = new SpeechSynthesisUtterance("Hey, I am IRA.");
                utterance1.lang = 'en-US';
                utterance1.rate = 0.9;
                utterance1.pitch = 1.1;

                const utterance2 = new SpeechSynthesisUtterance("Welcome to R.N.G.P.I.T.");
                utterance2.lang = 'en-US';
                utterance2.rate = 0.9;
                utterance2.pitch = 1.1;
                
                window.speechSynthesis.speak(utterance1);
                window.speechSynthesis.speak(utterance2);
                console.log("Speech synthesis commands queued.");
            }, 100);
        });
    });
});
