/*
  FILE: src/routes/spaces.ts

  Note on route order: "/mine" must be registered BEFORE "/:id", or
  Express would try to match "mine" as if it were a numeric space id.
*/

import { Router } from 'express';
import {
  searchSpaces,
  getMySpaces,
  getSpaceById,
  createSpace,
  updateSpace,
  toggleActive
} from '../controllers/spacesController.js';
import { listBlocks, createBlock, deleteBlock } from '../controllers/blocksController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import { createSpaceSchema, updateSpaceSchema } from '../validators/spaceValidators.js';
import { createBlockSchema } from '../validators/blockValidators.js';

const router = Router();

router.get('/', searchSpaces);
router.get('/mine', authMiddleware, getMySpaces);
router.get('/:id', getSpaceById);
router.post('/', authMiddleware, validateBody(createSpaceSchema), createSpace);
router.patch('/:id', authMiddleware, validateBody(updateSpaceSchema), updateSpace);
router.patch('/:id/toggle-active', authMiddleware, toggleActive);

router.get('/:id/blocks', authMiddleware, listBlocks);
router.post('/:id/blocks', authMiddleware, validateBody(createBlockSchema), createBlock);
router.delete('/:id/blocks/:blockId', authMiddleware, deleteBlock);

export default router;
