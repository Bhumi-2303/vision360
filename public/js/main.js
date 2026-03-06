import { db } from "./firebase-init.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const cardGrid = document.getElementById("building-cards-grid");

    // Clear loading state
    cardGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #aaa;">Loading campuses...</p>';

    try {
        // We query all scenes from root, technically we might want to filter only "Buildings"
        // But the task requirements imply pulling scenes that the admin created.
        // For simplicity, we just pull everything and treat them as potential entry points,
        // or let's assume buildings don't have "parent" pointers, though we didn't add parent pointers
        // explicitly to the schema. We'll simply list all buildings added. 
        // For real-world, we could add `type:"building"` inside AdminDashboard form. We'll just list all root nodes.

        const querySnapshot = await getDocs(collection(db, "scenes"));

        cardGrid.innerHTML = ''; // clear 

        if (querySnapshot.empty) {
            cardGrid.innerHTML = '<p style="text-align: center; width: 100%; color: #aaa;">No campuses available yet.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;

            // Build card HTML
            const card = document.createElement("div");
            card.className = "card";

            // Extract a random background image safely
            const imageStyle = data.panorama ? `background-image: url('${data.panorama}')` : 'background: #333';

            card.innerHTML = `
                <div class="card-image" style="${imageStyle}"></div>
                <div class="card-content">
                    <h3>${data.title}</h3>
                    <p>Explore this immersive 360 view.</p>
                    <button class="btn btn-outline"
                        onclick="window.location.href='viewer.html?scene=${id}'">
                        Explore
                    </button>
                </div>
            `;

            cardGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading campuses:", error);
        cardGrid.innerHTML = `<p style="text-align: center; width: 100%; color: #ff6b6b;">Failed to load campuses: ${error.message}</p>`;
    }
});
