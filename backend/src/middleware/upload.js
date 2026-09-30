import multer from 'multer';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TYPES[file.mimetype]) return cb(new Error('Photo must be a JPG, PNG or WEBP image.'));
    file.ext = TYPES[file.mimetype];
    cb(null, true);
  },
});
