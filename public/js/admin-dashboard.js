import { auth, db, storage } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, doc, setDoc, getDocs, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const ADMIN_EMAIL = "admin@vision360.com";

document.addEventListener("DOMContentLoaded", () => {

    // Auth Check
    onAuthStateChanged(auth, (user) => {
        if (user && user.email === ADMIN_EMAIL) {
            document.getElementById("auth-loading").style.display = "none";
            document.getElementById("dashboard-content").style.display = "flex";
            loadDropdowns();
        } else {
            window.location.href = "login.html";
        }
    });

    document.getElementById("logout-btn").addEventListener("click", async (e) => {
        e.preventDefault();
        await signOut(auth);
    });

    // Tab Switching Logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabSections = document.querySelectorAll('.tab-section');
    const sectionTitle = document.getElementById('section-title');

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            navBtns.forEach(b => b.classList.remove('active'));
            tabSections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');

            const targetId = btn.dataset.target;
            document.getElementById(targetId).classList.add('active');

            sectionTitle.textContent = btn.textContent.trim();
        });
    });

    // Populate Dropdowns and admin list
    async function loadDropdowns() {
        const dParent = document.getElementById("d-parent");
        const cParent = document.getElementById("c-parent");
        const editListContainer = document.getElementById("edit-scene-list");
        const deleteListContainer = document.getElementById("delete-scene-list");

        dParent.innerHTML = '<option value="">Select Building...</option>';
        cParent.innerHTML = '<option value="">Select Department...</option>';

        if (editListContainer) editListContainer.innerHTML = '';
        if (deleteListContainer) deleteListContainer.innerHTML = '';

        try {
            const querySnapshot = await getDocs(collection(db, "scenes"));

            if (querySnapshot.empty) {
                if (editListContainer) editListContainer.innerHTML = '<li>No scenes found.</li>';
                if (deleteListContainer) deleteListContainer.innerHTML = '<li>No scenes found.</li>';
                return;
            }

            // Save global reference for editing
            window.allScenes = [];
            querySnapshot.forEach(docSnap => {
                window.allScenes.push({ id: docSnap.id, ...docSnap.data() });
            });

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const option = `<option value="${docSnap.id}">${data.title} (${docSnap.id})</option>`;

                // Add to dropdowns
                dParent.innerHTML += option;
                cParent.innerHTML += option;

                // Add to Edit List
                if (editListContainer) {
                    const editLi = document.createElement('li');
                    editLi.className = 'scene-item';
                    editLi.innerHTML = `
                        <div class="scene-info">
                            <strong>${data.title}</strong>
                            <span>ID: ${docSnap.id}</span>
                            <span>Hotspots: ${data.hotSpots ? data.hotSpots.length : 0}</span>
                        </div>
                        <div class="scene-actions">
                            <button class="edit-btn" data-id="${docSnap.id}" title="Edit Scene">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    `;
                    editListContainer.appendChild(editLi);
                }

                // Add to Delete List
                if (deleteListContainer) {
                    const deleteLi = document.createElement('li');
                    deleteLi.className = 'scene-item';
                    deleteLi.innerHTML = `
                        <div class="scene-info">
                            <strong>${data.title}</strong>
                            <span>ID: ${docSnap.id}</span>
                            <span>Hotspots: ${data.hotSpots ? data.hotSpots.length : 0}</span>
                        </div>
                        <div class="scene-actions">
                            <button class="delete-btn" data-id="${docSnap.id}" title="Delete Scene">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    deleteListContainer.appendChild(deleteLi);
                }
            });

            // Attach Action Listeners
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const sceneId = e.currentTarget.dataset.id;
                    if (confirm(`Are you sure you want to completely delete the scene: ${sceneId}?`)) {
                        await deleteScene(sceneId);
                    }
                });
            });

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sceneId = e.currentTarget.dataset.id;
                    openEditModal(sceneId);
                });
            });

        } catch (error) {
            console.error("Error loading scenes from Firestore:", error);
            if (editListContainer) editListContainer.innerHTML = '<li>Error loading scenes.</li>';
            if (deleteListContainer) deleteListContainer.innerHTML = '<li>Error loading scenes.</li>';
        }
    }

    // --- Modal & Hotspot Logic ---
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const editForm = document.getElementById('edit-scene-form');
    const hotspotsContainer = document.getElementById('edit-hotspots-container');
    const addHotspotBtn = document.getElementById('add-hotspot-btn');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal if clicked outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    let currentEditingScene = null;

    function openEditModal(sceneId) {
        currentEditingScene = window.allScenes.find(s => s.id === sceneId);
        if (!currentEditingScene) return;

        document.getElementById('edit-modal-title').textContent = `Editing: ${currentEditingScene.title} (${sceneId})`;
        document.getElementById('edit-scene-id').value = sceneId;
        document.getElementById('edit-title').value = currentEditingScene.title;
        document.getElementById('edit-panorama').value = ''; // Reset file input

        // Render existing hotspots
        hotspotsContainer.innerHTML = '';
        if (currentEditingScene.hotSpots) {
            currentEditingScene.hotSpots.forEach((hs) => {
                addHotspotUI(hs);
            });
        }

        modal.style.display = 'flex';
    }

    function addHotspotUI(hotspot = { pitch: 0, yaw: 0, text: 'New Target', sceneId: '' }) {
        const div = document.createElement('div');
        div.className = 'hotspot-item';

        let targetOptions = '<option value="">Select Target Scene...</option>';
        window.allScenes.forEach(s => {
            const selected = s.id === hotspot.sceneId ? 'selected' : '';
            targetOptions += `<option value="${s.id}" ${selected}>${s.title} (${s.id})</option>`;
        });

        div.innerHTML = `
            <input type="number" class="hs-yaw" placeholder="Yaw" value="${hotspot.yaw}" required style="width: 80px">
            <input type="text" class="hs-text" placeholder="Label Text" value="${hotspot.text}" required>
            <select class="hs-target" required>
                ${targetOptions}
            </select>
            <button type="button" class="remove-hs-btn"><i class="fas fa-times"></i></button>
        `;

        div.querySelector('.remove-hs-btn').addEventListener('click', () => {
            div.remove();
        });

        hotspotsContainer.appendChild(div);
    }

    addHotspotBtn.addEventListener('click', () => {
        addHotspotUI();
    });

    // Handle Edit Save
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        try {
            const sceneId = document.getElementById('edit-scene-id').value;
            const updates = {
                title: document.getElementById('edit-title').value,
            };

            // Check if new image was uploaded
            const fileInput = document.getElementById('edit-panorama');
            if (fileInput.files.length > 0) {
                const newUrl = await uploadImage(fileInput);
                updates.panorama = newUrl;
            }

            // Gather hotspots
            const newHotspots = [];
            document.querySelectorAll('.hotspot-item').forEach(item => {
                newHotspots.push({
                    type: "scene",
                    pitch: 0,
                    yaw: Number(item.querySelector('.hs-yaw').value),
                    text: item.querySelector('.hs-text').value,
                    sceneId: item.querySelector('.hs-target').value
                });
            });
            updates.hotSpots = newHotspots;

            await updateDoc(doc(db, "scenes", sceneId), updates);
            alert("Scene updated successfully!");
            modal.style.display = 'none';
            loadDropdowns(); // Refresh list
        } catch (error) {
            console.error("Error updating scene:", error);
            alert("Failed to update: " + error.message);
        } finally {
            submitBtn.textContent = 'Save Changes';
            submitBtn.disabled = false;
        }
    });

    // Delete Scene logic
    async function deleteScene(id) {
        try {
            const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
            await deleteDoc(doc(db, "scenes", id));
            alert(`Scene '${id}' successfully deleted! Note: Its image in Firebase Storage remains.`);
            loadDropdowns();
        } catch (error) {
            console.error("Error deleting scene:", error);
            alert("Error: " + error.message);
        }
    }

    // Helper to upload image to local Express backend
    async function uploadImage(fileInput) {
        if (!fileInput.files || fileInput.files.length === 0) {
            throw new Error("No image selected");
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append("panorama", file);

        try {
            const response = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Upload failed");
            }

            const data = await response.json();
            return data.url; // Relative path, e.g. "images/filename.jpg"
        } catch (error) {
            console.error("EXPRESS UPLOAD ERROR:", error);
            throw new Error("Local Upload Failed: " + error.message);
        }
    }

    // Add Scene Helper
    async function addScene(id, data, parentId, hotspotYaw, backText) {
        try {
            // Save Scene Document
            await setDoc(doc(db, "scenes", id), data);

            // Connect Parent Scene if specified
            if (parentId) {
                const parentRef = doc(db, "scenes", parentId);
                await updateDoc(parentRef, {
                    hotSpots: arrayUnion({
                        pitch: 0,
                        yaw: Number(hotspotYaw),
                        type: "scene",
                        text: `Go to ${data.title}`,
                        sceneId: id
                    })
                });

                // Also connect a back button automatically from child to parent
                const childRef = doc(db, "scenes", id);
                await updateDoc(childRef, {
                    hotSpots: arrayUnion({
                        pitch: 0,
                        yaw: 180, // usually looked opposite direction behind you
                        type: "scene",
                        text: backText || `Back`,
                        sceneId: parentId
                    })
                });
            }

            alert(`Successfully added ${data.title} and processed image!`);
            loadDropdowns(); // Refresh dropdowns
        } catch (error) {
            console.error("Error saving scene:", error);
            alert("Error: " + error.message);
        }
    }

    // Handle Forms
    document.getElementById("add-building-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const submitBtn = e.target.querySelector('button');
            submitBtn.textContent = "Uploading...";
            submitBtn.disabled = true;

            const panoramaUrl = await uploadImage(document.getElementById("b-panorama"));
            const id = document.getElementById("b-id").value;
            const data = {
                title: document.getElementById("b-title").value,
                type: "equirectangular",
                panorama: panoramaUrl,
                hotSpots: []
            };
            await addScene(id, data, null, null, null);
            e.target.reset();
        } catch (err) {
            alert(err.message);
        } finally {
            const submitBtn = e.target.querySelector('button');
            submitBtn.textContent = "Add Building";
            submitBtn.disabled = false;
        }
    });

    document.getElementById("add-dept-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const parentId = document.getElementById("d-parent").value;
        if (!parentId) return alert("Select a parent building first!");

        try {
            const submitBtn = e.target.querySelector('button');
            submitBtn.textContent = "Uploading...";
            submitBtn.disabled = true;

            const panoramaUrl = await uploadImage(document.getElementById("d-panorama"));
            const id = document.getElementById("d-id").value;
            const yaw = document.getElementById("d-yaw").value;
            const data = {
                title: document.getElementById("d-title").value,
                type: "equirectangular",
                panorama: panoramaUrl,
                hotSpots: []
            };
            await addScene(id, data, parentId, yaw, "Back to Building");
            e.target.reset();
        } catch (err) {
            alert(err.message);
        } finally {
            const submitBtn = e.target.querySelector('button');
            submitBtn.textContent = "Add Department";
            submitBtn.disabled = false;
        }
    });

    document.getElementById("add-class-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const parentId = document.getElementById("c-parent").value;
        if (!parentId) return alert("Select a parent department first!");

        try {
            const submitBtn = e.target.querySelector('button');
            submitBtn.textContent = "Uploading...";
            submitBtn.disabled = true;

            const panoramaUrl = await uploadImage(document.getElementById("c-panorama"));
            const id = document.getElementById("c-id").value;
            const yaw = document.getElementById("c-yaw").value;
            const data = {
                title: document.getElementById("c-title").value,
                type: "equirectangular",
                panorama: panoramaUrl,
                hotSpots: []
            };
            await addScene(id, data, parentId, yaw, "Back to Department");
            e.target.reset();
        } catch (err) {
            alert(err.message);
        } finally {
            const submitBtn = e.target.querySelector('button');
            submitBtn.textContent = "Add Classroom";
            submitBtn.disabled = false;
        }
    });

});
