
export const validateFiles = (req, res, next) => {
  const errors = [];

  // Check main content file
  if (!req.files || !req.files.file || !req.files.file[0]) {
    errors.push({ msg: 'Main file is required', path: 'file' });
  } else {
    const mainFile = req.files.file[0];
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg',
      'image/gif', 'video/mp4', 'application/pdf',
      'application/zip', 'audio/mpeg', 'audio/mp3'
    ];
    if (!allowedTypes.includes(mainFile.mimetype)) {
      errors.push({ msg: 'Unsupported main file type', path: 'file' });
    }
    if (mainFile.size > 10 * 1024 * 1024) {
      errors.push({ msg: 'Main file size exceeds 10MB limit', path: 'file' });
    }
  }

  // Check preview image
  if (!req.files || !req.files.previewImage || !req.files.previewImage[0]) {
    errors.push({ msg: 'Preview image is required', path: 'previewImage' });
  } else {
    const preview = req.files.previewImage[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
    if (!allowedTypes.includes(preview.mimetype)) {
      errors.push({ msg: 'Preview image must be JPG, PNG, or GIF', path: 'previewImage' });
    }
    if (preview.size > 5 * 1024 * 1024) {
      errors.push({ msg: 'Preview image size exceeds 5MB limit', path: 'previewImage' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};
