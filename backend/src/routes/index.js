const { Router } = require('express');

const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const mediaRoutes = require('./mediaRoutes');
const adminRoutes = require('./adminRoutes');

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/media', mediaRoutes);
router.use('/admin', adminRoutes);

module.exports = router;