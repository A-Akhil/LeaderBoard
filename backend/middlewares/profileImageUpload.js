const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create a factory function that returns middleware configured for a specific user type
const createProfileUploadMiddleware = (userType) => {
  // Create the appropriate upload directory based on user type
  const uploadDir = path.join(__dirname, `../uploads/profile/${userType}`);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Multer storage configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    
    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Only JPEG and PNG images are allowed!'), false);
      return;
    }
    
    // Check file extension as additional security
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      cb(new Error('Invalid file extension. Only .jpg, .jpeg, .png are allowed!'), false);
      return;
    }
    
    // Check for double extensions (e.g., .jpg.php)
    const fileName = file.originalname.toLowerCase();
    const suspiciousExtensions = ['.php', '.js', '.html', '.exe', '.bat', '.sh'];
    if (suspiciousExtensions.some(ext => fileName.includes(ext))) {
      cb(new Error('Suspicious file detected!'), false);
      return;
    }
    
    cb(null, true);
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 0.5 * 1024 * 1024, // 0.5MB file limit
    },
  });

  return upload.single('profileImage');
};

module.exports = { createProfileUploadMiddleware };