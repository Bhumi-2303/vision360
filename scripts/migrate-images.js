/**
 * One-time migration script: uploads existing local panorama images to Cloudinary
 * and updates the Firestore 'panorama' field with the Cloudinary URL.
 *
 * Usage (from project root):
 *   node scripts/migrate-images.js
 *
 * Prerequisites:
 *   - server/.env must have Cloudinary credentials
 *   - serviceAccount.json must exist at project root
 *     (Download from Firebase Console → Project Settings → Service Accounts → Generate New Private Key)
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

// Load server env for Cloudinary creds
dotenv.config({ path: path.join(ROOT, 'server', '.env') });

// ── Cloudinary ──────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Firebase Admin ──────────────────────────────────────────────
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccountPath = path.join(ROOT, 'serviceAccount.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ serviceAccount.json not found at project root.');
    console.error('   Download it from:');
    console.error('   Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
    console.error(`   Expected path: ${serviceAccountPath}`);
    process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const adminApp = initializeApp({ credential: cert(sa) });
const db = getFirestore(adminApp);

// ── Migration ───────────────────────────────────────────────────
async function migrate() {
    console.log('\n🔄 Starting image migration to Cloudinary...');
    console.log(`   Cloudinary cloud: ${process.env.CLOUDINARY_CLOUD_NAME}\n`);

    const scenesRef = db.collection('scenes');
    const snapshot  = await scenesRef.get();

    if (snapshot.empty) {
        console.log('⚠️  No scenes found in Firestore.');
        return;
    }

    console.log(`Found ${snapshot.size} scenes in Firestore.\n`);

    let migrated = 0;
    let skipped  = 0;
    let failed   = 0;

    for (const docSnap of snapshot.docs) {
        const data     = docSnap.data();
        const sceneId  = docSnap.id;
        const panorama = data.panorama;

        // Skip scenes that already have a Cloudinary/external URL
        if (!panorama) {
            console.log(`⏭  ${sceneId}: no panorama field — skipping`);
            skipped++;
            continue;
        }

        if (panorama.startsWith('https://') || panorama.startsWith('http://')) {
            console.log(`⏭  ${sceneId}: already a cloud URL — skipping`);
            skipped++;
            continue;
        }

        // Resolve local file path
        const localPath = path.join(ROOT, 'public', panorama);
        if (!fs.existsSync(localPath)) {
            console.error(`❌ ${sceneId}: local file not found at ${localPath}`);
            failed++;
            continue;
        }

        try {
            const fileSize = (fs.statSync(localPath).size / (1024 * 1024)).toFixed(1);
            console.log(`📤 ${sceneId}: uploading ${panorama} (${fileSize} MB)...`);

            const result = await cloudinary.uploader.upload(localPath, {
                folder: 'vision360',
                public_id: sceneId,
                resource_type: 'image',
                overwrite: true,
            });

            // Update Firestore with Cloudinary URL
            await scenesRef.doc(sceneId).update({
                panorama:  result.secure_url,
                public_id: result.public_id,
            });

            console.log(`   ✅ Done → ${result.secure_url}\n`);
            migrated++;
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}\n`);
            failed++;
        }
    }

    console.log(`\n══════════════════════════════════════`);
    console.log(`  Migration Complete`);
    console.log(`══════════════════════════════════════`);
    console.log(`  ✅ Migrated: ${migrated}`);
    console.log(`  ⏭  Skipped:  ${skipped}`);
    console.log(`  ❌ Failed:   ${failed}`);
    console.log(`  📊 Total:    ${snapshot.size}`);
    console.log(`══════════════════════════════════════\n`);
}

migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
