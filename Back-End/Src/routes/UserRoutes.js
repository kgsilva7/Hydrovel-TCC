const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const auth = require('../middleware/auth');

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/:userId/settings', auth, UserController.getUserSettings);
router.put('/:userId/settings', auth, UserController.updateUserSettings);

module.exports = router;