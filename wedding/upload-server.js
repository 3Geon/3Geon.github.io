// ============================================
// Wedding Photo Upload Server
// ============================================
// Run: node upload-server.js
// Server will start on http://localhost:3000

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ====== CONFIGURATION ======
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const GUESTBOOK_DIR = path.join(__dirname, 'guestbook');

// Create directories if they don't exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 Created uploads directory');
}

if (!fs.existsSync(GUESTBOOK_DIR)) {
    fs.mkdirSync(GUESTBOOK_DIR, { recursive: true });
    console.log('📁 Created guestbook directory');
}

// ====== CORS CONFIGURATION ======
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// ====== STATIC FILES ======
// Serve static files from the wedding directory
app.use(express.static(path.join(__dirname)));

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// Serve album photos
app.use('/album', express.static(path.join(__dirname, 'album')));

// Redirect root to index.html
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// ====== MULTER CONFIGURATION ======
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function(req, file, cb) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${timestamp}-${randomString}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF, WebP)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10
    }
});

// ====== API ROUTES ======

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Upload server is running' });
});

// Upload photos
app.post('/api/upload', upload.array('photos', 10), (req, res) => {
    try {
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '업로드된 파일이 없습니다.'
            });
        }

        const uploadedFiles = files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: `/uploads/${file.filename}`
        }));

        console.log(`✅ ${files.length} photo(s) uploaded successfully`);

        res.json({
            success: true,
            count: files.length,
            files: uploadedFiles,
            message: `${files.length}개의 사진이 업로드되었습니다.`
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            success: false,
            message: '업로드 중 오류가 발생했습니다.'
        });
    }
});

// ====== GUESTBOOK API ======

// Submit guestbook entry
app.post('/api/guestbook', upload.single('photo'), (req, res) => {
    try {
        const { name, message } = req.body;
        const photo = req.file;

        if (!name || !message) {
            return res.status(400).json({
                success: false,
                message: '이름과 메시지를 입력해 주세요.'
            });
        }

        const entry = {
            id: Date.now().toString(),
            name: name,
            message: message,
            photo: photo ? photo.filename : null,
            createdAt: new Date().toISOString()
        };

        // Save to guestbook.json
        const guestbookFile = path.join(GUESTBOOK_DIR, 'guestbook.json');
        let entries = [];

        if (fs.existsSync(guestbookFile)) {
            const data = fs.readFileSync(guestbookFile, 'utf8');
            entries = JSON.parse(data);
        }

        entries.push(entry);
        fs.writeFileSync(guestbookFile, JSON.stringify(entries, null, 2));

        console.log(`✅ Guestbook entry added: ${name}`);

        res.json({
            success: true,
            message: '방명록이 등록되었습니다.',
            entry: entry
        });
    } catch (error) {
        console.error('❌ Guestbook error:', error);
        res.status(500).json({
            success: false,
            message: '방명록 등록 중 오류가 발생했습니다.'
        });
    }
});

// Get guestbook entries
app.get('/api/guestbook', (req, res) => {
    try {
        const guestbookFile = path.join(GUESTBOOK_DIR, 'guestbook.json');
        
        if (!fs.existsSync(guestbookFile)) {
            return res.json([]);
        }

        const data = fs.readFileSync(guestbookFile, 'utf8');
        const entries = JSON.parse(data);
        
        // Sort by date (newest first)
        entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(entries);
    } catch (error) {
        console.error('❌ Error loading guestbook:', error);
        res.status(500).json({
            success: false,
            message: '방명록을 불러오는데 실패했습니다.'
        });
    }
});

// Get album photos from album folder
app.get('/api/album', (req, res) => {
    try {
        const albumDir = path.join(__dirname, 'album');
        
        if (!fs.existsSync(albumDir)) {
            return res.json([]);
        }

        fs.readdir(albumDir, (err, files) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '앨범 사진을 불러오는데 실패했습니다.'
                });
            }

            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const photos = files
                .filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return imageExtensions.includes(ext);
                })
                .map(filename => ({
                    filename: filename,
                    path: `/album/${filename}`
                }))
                .sort((a, b) => a.filename.localeCompare(b.filename));

            res.json(photos);
        });
    } catch (error) {
        console.error('❌ Error loading album:', error);
        res.status(500).json({
            success: false,
            message: '앨범을 불러오는데 실패했습니다.'
        });
    }
});

// Get list of uploaded photos
app.get('/api/photos', (req, res) => {
    try {
        fs.readdir(UPLOAD_DIR, (err, files) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: '사진 목록을 불러오는데 실패했습니다.'
                });
            }

            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const photos = files
                .filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return imageExtensions.includes(ext);
                })
                .map(filename => {
                    const filePath = path.join(UPLOAD_DIR, filename);
                    const stats = fs.statSync(filePath);
                    return {
                        filename: filename,
                        size: stats.size,
                        createdAt: stats.birthtime || stats.mtime
                    };
                })
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            res.json(photos);
        });
    } catch (error) {
        console.error('❌ Error listing photos:', error);
        res.status(500).json({
            success: false,
            message: '사진 목록을 불러오는데 실패했습니다.'
        });
    }
});

// Serve guestbook photos
app.use('/guestbook', express.static(GUESTBOOK_DIR));

// ====== ERROR HANDLING MIDDLEWARE ======
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: '파일 크기는 10MB를 초과할 수 없습니다.'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: '한 번에 최대 10개의 파일만 업로드할 수 있습니다.'
            });
        }
        return res.status(400).json({
            success: false,
            message: '파일 업로드 중 오류가 발생했습니다.'
        });
    }

    if (err.message === '이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF, WebP)') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    console.error('❌ Server error:', err);
    res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
    });
});

// ====== START SERVER ======
app.listen(PORT, () => {
    console.log('========================================');
    console.log('  💒 모바일 청첩장 서버');
    console.log('========================================');
    console.log(`  📡 접속 주소: http://localhost:${PORT}`);
    console.log(`  📸 업로드 API: http://localhost:${PORT}/api/upload`);
    console.log(`  🖼️  사진 목록: http://localhost:${PORT}/api/photos`);
    console.log(`  📝 방명록 API: http://localhost:${PORT}/api/guestbook`);
    console.log(`  🎨 앨범 API: http://localhost:${PORT}/api/album`);
    console.log(`  📁 업로드 폴더: ${UPLOAD_DIR}`);
    console.log('========================================');
    console.log('  🎉 브라우저에서 http://localhost:' + PORT + ' 로 접속하세요!');
    console.log('========================================');
});