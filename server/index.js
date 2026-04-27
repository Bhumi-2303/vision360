import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load .env from the server/ directory (CWD is project root when run via npm scripts)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// ── Cloudinary config ───────────────────────────────────────────
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ FATAL: Missing Cloudinary credentials!');
    console.error('   Create a .env file in the server/ directory with:');
    console.error('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.error('   CLOUDINARY_API_KEY=your_api_key');
    console.error('   CLOUDINARY_API_SECRET=your_api_secret');
    console.error('   Copy server/.env.example to server/.env and fill in your values.');
    process.exit(1);
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Express setup ───────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// CORS — allow frontend origins (comma-separated in env)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (e.g. Postman, server-to-server)
        if (!origin) return cb(null, true);
        // Allow localhost during development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) return cb(null, true);
        // Allow configured origins
        if (allowedOrigins.some(ao => origin.includes(ao))) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json());

// ── Multer — memory storage (stateless, no disk writes) ─────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    },
});

// ── Health check ────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'vision360-api', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ── Upload endpoint ─────────────────────────────────────────────
// POST /api/upload
// Accepts: multipart/form-data with field "file"
// Returns: { success: true, url: "https://res.cloudinary.com/...", public_id: "vision360/..." }
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        // Upload buffer to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'vision360',
                    resource_type: 'image',
                    quality: 'auto',
                    fetch_format: 'auto',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });

        res.status(200).json({
            success:   true,
            url:       result.secure_url,
            public_id: result.public_id,
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
});

// ── Error handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Vision360 API running on port ${PORT}`);
    console.log(`   Cloudinary cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   Allowed origins: ${allowedOrigins.join(', ') || '(localhost only)'}`);
});
