const { Router } = require('express');
const favoriteController = require('../controllers/favoriteController');
const { authenticate, authorize } = require('../middlewares/auth');
const { ROLES } = require('../constants/roles');

const router = Router();
router.use(authenticate, authorize(ROLES.VISITOR));
router.get('/', favoriteController.list);
router.post('/:productId', favoriteController.add);
router.delete('/:productId', favoriteController.remove);

module.exports = router;
