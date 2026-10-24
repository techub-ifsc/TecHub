const { Router } = require('express');

const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const mediaRoutes = require('./mediaRoutes');
const adminRoutes = require('./adminRoutes');
const userProfileRoutes = require('./userProfileRoutes');
const chatRoutes = require('./chatRoutes');

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/media', mediaRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userProfileRoutes);
router.use('/chat', chatRoutes);

module.exports = router;