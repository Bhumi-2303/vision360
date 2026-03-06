import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const cardGrid = document.getElementById("building-cards-grid");
    const statScenes = document.getElementById("stat-scenes");

    try {
        const querySnapshot = await getDocs(collection(db, "scenes"));
        const scenes = [];

        querySnapshot.forEach((doc) => {
            scenes.push({ id: doc.id, ...doc.data() });
        });

        // Update live stat counter
        if (statScenes) statScenes.textContent = scenes.length;

        // Clear skeleton loaders
        cardGrid.innerHTML = '';

        if (scenes.length === 0) {
            cardGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                    <i class="fas fa-cube" style="font-size: 3rem; color: var(--text-faint); margin-bottom: 20px; display: block;"></i>
                    <p style="color: var(--text-muted); font-size: 1.1rem;">No campuses available yet. Check back soon!</p>
                </div>`;
            return;
        }

        // Normalise sceneType — infer from title if missing/unrecognized
        const knownTypes = new Set(['building', 'department', 'classroom', 'lab']);

        function inferType(s) {
            const raw = (s.sceneType || '').toLowerCase().trim();
            if (knownTypes.has(raw)) return raw;
            // Infer from title keywords
            const t = (s.title || '').toLowerCase();
            if (t.includes('campus') || t.includes('main'))            return 'building';
            if (t.includes('department') || t.includes('dept'))        return 'department';
            if (t.includes('lab') || t.includes('laboratory'))         return 'lab';
            if (t.includes('room') || t.includes('class') || t.includes('hall')) return 'classroom';
            return 'building'; // final fallback
        }

        scenes.forEach(s => { s.sceneType = inferType(s); });

        // Sort: Main Campus(1) → Department(2) → Classroom(3) → Lab(4), A-Z within each
        const typeOrder = { building: 1, department: 2, classroom: 3, lab: 4 };
        const sorted = [...scenes].sort((a, b) => {
            const aO = typeOrder[a.sceneType] || 1;
            const bO = typeOrder[b.sceneType] || 1;
            if (aO !== bO) return aO - bO;
            return (a.title || '').localeCompare(b.title || '');
        });
        const toShow = sorted;

        toShow.forEach((data, idx) => {
            const card = document.createElement("div");
            card.className = "campus-card";
            card.style.animationDelay = `${idx * 0.1}s`;

            // Type label — matches hierarchy naming
            const typeMap = { building: 'Main Campus', department: 'Department', classroom: 'Classroom', lab: 'Lab' };
            const typeLabel = typeMap[data.sceneType] || 'Main Campus';

            // Hotspot count
            const hsCount = data.hotSpots ? data.hotSpots.length : 0;

            card.innerHTML = `
                <div class="card-content">
                    <div class="card-badge" style="display:inline-block; margin-bottom:14px;">${typeLabel}</div>
                    <h3>${data.title}</h3>
                    <p>Explore this immersive 360° panoramic view and navigate through interactive hotspots.</p>
                    <div class="card-footer">
                        <button class="explore-btn" data-id="${data.id}">
                            Explore <i class="fas fa-arrow-right"></i>
                        </button>
                        <div class="card-meta">
                            <i class="fas fa-map-pin"></i>
                            ${hsCount} hotspot${hsCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            `;

            cardGrid.appendChild(card);
        });

        // Attach navigation on explore buttons
        cardGrid.querySelectorAll('.explore-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sceneId = btn.dataset.id;
                window.location.href = `viewer.html?scene=${sceneId}`;
            });
        });

    } catch (error) {
        console.error("Error loading campuses:", error);
        cardGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: var(--c-danger); margin-bottom: 20px; display: block;"></i>
                <p style="color: var(--c-danger);">Failed to load campuses. Please check your connection and try again.</p>
                <small style="color: var(--text-faint); margin-top: 10px; display: block;">${error.message}</small>
            </div>`;
    }
});
