/**
 * Step 1: Upload all local panorama images to Cloudinary
 * and print a mapping of local filename -> Cloudinary URL.
 *
 * Usage: node scripts/upload-images-to-cloudinary.js
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load .env from server/
dotenv.config({ path: path.resolve(__dirname, '..', 'server', '.env') });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGES_DIR = path.resolve(__dirname, '..', 'public', 'images');

async function main() {
    console.log('🔄 Uploading local panorama images to Cloudinary...\n');
    console.log(`   Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   Dir:   ${IMAGES_DIR}\n`);

    const files = fs.readdirSync(IMAGES_DIR).filter(f =>
        /\.(jpg|jpeg|png|webp)$/i.test(f) && f !== 'ai_avatar.png'
    );

    console.log(`   Found ${files.length} image files\n`);

    const mapping = {};

    for (const file of files) {
        const localPath = path.join(IMAGES_DIR, file);
        const fileSize = (fs.statSync(localPath).size / (1024 * 1024)).toFixed(1);
        const localKey = `images/${file}`;

        console.log(`   📤 Uploading ${file} (${fileSize} MB)...`);

        try {
            const result = await cloudinary.uploader.upload(localPath, {
                folder: 'vision360',
                public_id: path.parse(file).name, // Use filename without extension as public_id
                resource_type: 'image',
                overwrite: true,
            });

            mapping[localKey] = result.secure_url;
            console.log(`   ✅ → ${result.secure_url}\n`);
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}\n`);
        }
    }

    // Write the mapping to a JSON file for use by the Firestore update script
    const mappingPath = path.resolve(__dirname, 'cloudinary-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

    console.log(`\n📋 Mapping saved to: ${mappingPath}`);
    console.log(`   Total uploaded: ${Object.keys(mapping).length}/${files.length}`);
    console.log('\n   Next step: Use the admin dashboard to update scene URLs,');
    console.log('   or run the Firestore updater endpoint.\n');

    // Print the mapping nicely
    console.log('═══ URL Mapping ═══');
    Object.entries(mapping).forEach(([local, cloud]) => {
        console.log(`   ${local}`);
        console.log(`   → ${cloud}\n`);
    });
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
