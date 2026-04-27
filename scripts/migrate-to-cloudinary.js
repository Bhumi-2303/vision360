/**
 * Migration Script: Re-upload local panorama images to Cloudinary
 * and update Firestore document URLs.
 *
 * Usage:
 *   1. Make sure server/.env has valid Cloudinary credentials
 *   2. Run: node scripts/migrate-to-cloudinary.js
 *
 * What it does:
 *   - Reads all scenes from Firestore
 *   - Finds scenes whose `panorama` field is a local path (not https://)
 *   - Uploads the corresponding local image to Cloudinary
 *   - Updates the Firestore document with the Cloudinary secure_url
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

// Firebase Admin SDK
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load .env from server/
dotenv.config({ path: path.resolve(__dirname, '..', 'server', '.env') });

// ── Cloudinary setup ────────────────────────────────────────────
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Missing Cloudinary credentials in server/.env');
    process.exit(1);
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Firebase Admin setup ────────────────────────────────────────
// Using the project's existing Firebase config
const firebaseConfig = {
    projectId: "virtualcampusexplorer",
};

// Initialize with application default credentials or service account
// For this script, we use the REST API approach via the client SDK's Firestore
// Since firebase-admin requires a service account, we'll use the client SDK instead

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyClr1OrQOHUx6GznJEHoCBIh2bXbF7CNtU",
    authDomain: "virtualcampusexplorer.firebaseapp.com",
    projectId: "virtualcampusexplorer",
    storageBucket: "virtualcampusexplorer.firebasestorage.app",
    messagingSenderId: "972342141922",
    appId: "1:972342141922:web:e618d4fd02d54231ae0fbb"
};

const app = initializeApp(FIREBASE_CONFIG);
const db  = getFirestore(app);

// ── Local images directory ──────────────────────────────────────
const IMAGES_DIR = path.resolve(__dirname, '..', 'public', 'images');

// ── Upload a local file to Cloudinary ───────────────────────────
async function uploadToCloudinary(localPath) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(localPath, {
            folder: 'vision360',
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto',
        }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });
}

// ── Main migration ──────────────────────────────────────────────
async function migrate() {
    console.log('🔄 Starting Cloudinary migration...\n');
    console.log(`   Cloudinary cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   Local images dir: ${IMAGES_DIR}\n`);

    // Fetch all scenes from Firestore
    const snap = await getDocs(collection(db, "scenes"));
    const scenes = [];
    snap.forEach(docSnap => {
        scenes.push({ id: docSnap.id, ...docSnap.data() });
    });

    console.log(`   Found ${scenes.length} scenes in Firestore\n`);

    let migrated = 0;
    let skipped  = 0;
    let failed   = 0;

    for (const scene of scenes) {
        const panorama = scene.panorama;

        // Skip scenes that already have a Cloudinary/external URL
        if (!panorama || panorama.startsWith('https://') || panorama.startsWith('http://')) {
            console.log(`   ⏭️  ${scene.id}: Already has external URL, skipping`);
            skipped++;
            continue;
        }

        // Resolve local file path
        // panorama could be "images/scene-xxx.JPG" or "/images/scene-xxx.JPG"
        const relativePath = panorama.replace(/^\//, ''); // strip leading slash
        const localPath = path.resolve(__dirname, '..', 'public', relativePath);

        if (!fs.existsSync(localPath)) {
            console.error(`   ❌ ${scene.id}: Local file NOT found: ${localPath}`);
            failed++;
            continue;
        }

        try {
            console.log(`   📤 ${scene.id}: Uploading ${path.basename(localPath)}...`);
            const result = await uploadToCloudinary(localPath);
            const cloudinaryUrl = result.secure_url;

            // Update Firestore with the Cloudinary URL
            await updateDoc(doc(db, "scenes", scene.id), {
                panorama: cloudinaryUrl
            });

            console.log(`   ✅ ${scene.id}: Migrated → ${cloudinaryUrl}`);
            migrated++;
        } catch (error) {
            console.error(`   ❌ ${scene.id}: Upload failed: ${error.message}`);
            failed++;
        }
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`   Total:      ${scenes.length}\n`);

    if (migrated > 0) {
        console.log('🎉 Migration complete! Your scenes now use Cloudinary URLs.');
        console.log('   The viewer should load panoramas from Cloudinary instead of local files.');
    }

    process.exit(0);
}

migrate().catch(err => {
    console.error('💥 Migration failed:', err);
    process.exit(1);
});
