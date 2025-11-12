const express = require('express');
const router = express.Router();

const { authAdmin } = require('../middlewares/auth.middlewares');
const bulkImportTemplateController = require('../controllers/bulkImportTemplate.controller');

router.get('/:type', authAdmin, bulkImportTemplateController.downloadTemplate);

module.exports = router;
