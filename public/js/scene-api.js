import { db } from "./firebase-init.js";
import { collection, getDocs } from "firebase/firestore";
import { inferType, sortScenes } from "./scene-helpers.js";

export async function fetchScenes() {
    const snap = await getDocs(collection(db, "scenes"));
    let allScenes = [];
    snap.forEach(doc => allScenes.push({ id: doc.id, ...doc.data() }));
    allScenes.forEach(s => { s.sceneType = inferType(s); });
    return sortScenes(allScenes);
}
