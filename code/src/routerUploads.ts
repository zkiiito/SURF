import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Types } from 'mongoose';
import fs from 'fs';
import Config from './Config.js';
import Storage from './Storage.js';
import { MessageModel } from './MongooseModels.js';
import { Message } from './model/Message.js';
import type { GoogleProfile } from './types.js';

const INLINE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'audio/mpeg',
  'audio/mp4',
  'application/pdf',
]);

const router = express.Router();

const MAX_FILES_PER_MESSAGE = 10;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const waveId = req.params.waveId;
      Storage.ensureWaveDir(waveId)
        .then(dir => cb(null, dir))
        .catch(err => cb(err as Error, ''));
    },
    filename: (_req, _file, cb) => {
      cb(null, Storage.generateKey());
    },
  }),
  limits: { fileSize: Config.maxUploadBytes, files: MAX_FILES_PER_MESSAGE },
});

async function resolveWaveMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const waveId = req.params.waveId;
  if (!waveId || !Types.ObjectId.isValid(waveId)) {
    res.status(400).json({ error: 'Invalid waveId' });
    return;
  }

  const { default: SurfServer } = await import('./SurfServer.js');
  const wave = SurfServer.waves.get(waveId);
  if (!wave) {
    res.status(404).json({ error: 'Wave not found' });
    return;
  }

  const passportUser = req.user as GoogleProfile;
  const email = passportUser.emails?.[0]?.value;
  const surfUser = SurfServer.users.find(u =>
    u.googleId === passportUser.id || (email !== undefined && u.email === email)
  );

  if (!surfUser || !wave.isMember(surfUser)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  (req as Request & { surfUserId: string; surfWaveId: string }).surfUserId = surfUser.id;
  (req as Request & { surfUserId: string; surfWaveId: string }).surfWaveId = wave.id;
  next();
}

function encodeContentDisposition(disposition: 'inline' | 'attachment', filename: string): string {
  const safeAscii = filename.replace(/[\\"\x00-\x1f\x7f]/g, '_');
  return `${disposition}; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

router.post(
  '/wave/:waveId/upload',
  resolveWaveMember,
  upload.array('file', MAX_FILES_PER_MESSAGE),
  async (req: Request, res: Response) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    const surfUserId = (req as Request & { surfUserId: string }).surfUserId;
    const surfWaveId = (req as Request & { surfWaveId: string }).surfWaveId;

    const cleanup = () => Promise.all(files.map(f => Storage.delete(surfWaveId, f.filename)));

    if (files.length === 0) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const caption = typeof req.body.caption === 'string' ? req.body.caption : '';
    const parentIdRaw = typeof req.body.parentId === 'string' ? req.body.parentId : '';
    const parentId = parentIdRaw && Types.ObjectId.isValid(parentIdRaw) ? parentIdRaw : null;

    try {
      const { default: SurfServer } = await import('./SurfServer.js');
      const wave = SurfServer.waves.get(surfWaveId);
      if (!wave) {
        await cleanup();
        res.status(404).json({ error: 'Wave not found' });
        return;
      }

      const msg = new Message({
        userId: surfUserId,
        waveId: surfWaveId,
        parentId,
        message: caption,
        attachments: files.map(f => ({
          storageKey: f.filename,
          filename: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
        })),
      });

      if (!msg.isValid()) {
        await cleanup();
        res.status(400).json({ error: 'Invalid message' });
        return;
      }

      await wave.addMessage(msg);
      res.status(201).json(msg.toJSON());
    } catch (err) {
      await cleanup();
      console.log('UPLOAD ERROR', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

router.get(
  '/wave/:waveId/file/:messageId/:storageKey',
  resolveWaveMember,
  async (req: Request, res: Response) => {
    const { messageId, storageKey } = req.params;
    if (!Types.ObjectId.isValid(messageId)) {
      res.status(400).json({ error: 'Invalid messageId' });
      return;
    }
    if (!/^[a-f0-9]{32}$/.test(storageKey)) {
      res.status(400).json({ error: 'Invalid storageKey' });
      return;
    }

    const surfWaveId = (req as Request & { surfWaveId: string }).surfWaveId;
    const msgDoc = await MessageModel.findById(messageId).exec();
    if (!msgDoc || msgDoc.waveId.toString() !== surfWaveId) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const attachment = msgDoc.attachments?.find(a => a.storageKey === storageKey);
    if (!attachment) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const { filename, mimeType, size } = attachment;
    const filePath = Storage.pathFor(surfWaveId, storageKey);

    if (!(await Storage.exists(surfWaveId, storageKey))) {
      res.status(404).json({ error: 'File missing on storage' });
      return;
    }

    const safeMime = INLINE_MIMES.has(mimeType) ? mimeType : 'application/octet-stream';
    const disposition = INLINE_MIMES.has(mimeType) ? 'inline' : 'attachment';
    res.setHeader('Content-Type', safeMime);
    res.setHeader('Content-Length', String(size));
    res.setHeader('Content-Disposition', encodeContentDisposition(disposition, filename));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    fs.createReadStream(filePath).pipe(res);
  }
);

router.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
