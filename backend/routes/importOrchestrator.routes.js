const express = require('express');
const { authAdmin } = require('../middlewares/auth.middlewares');
const orchestratorController = require('../controllers/importOrchestrator.controller');

const router = express.Router();

router.post(
  '/verify',
  authAdmin,
  orchestratorController.upload.fields(orchestratorController.FILE_FIELDS),
  orchestratorController.verifyBundle
);

router.post('/commit', authAdmin, orchestratorController.commitBundle);

module.exports = router;
