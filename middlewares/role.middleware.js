
export const creatorOnly = (req, res, next) => {
  try {
    // Ensure the user is authenticated first
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check role
    if (req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }

    next(); // user is a creator, continue
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
