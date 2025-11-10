const express = require('express');
const { authAdmin, requireSuperAdmin } = require('../middlewares/auth.middlewares');
const metadataController = require('../controllers/metadata.controller');

const router = express.Router();

router.use(authAdmin);

router.get('/departments', metadataController.listDepartments);
router.get('/programs', metadataController.listPrograms);
router.get('/courses', metadataController.listCourses);

router.post('/departments', requireSuperAdmin, metadataController.upsertDepartment);
router.put('/departments/:code', requireSuperAdmin, metadataController.upsertDepartment);

router.post('/programs', requireSuperAdmin, metadataController.upsertProgram);
router.put('/programs/:code', requireSuperAdmin, metadataController.upsertProgram);

router.post('/courses', requireSuperAdmin, metadataController.upsertCourse);
router.put('/courses/:code', requireSuperAdmin, metadataController.upsertCourse);

module.exports = router;
