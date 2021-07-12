import express from 'express';
import db from '../models/index.js';
import authenticationEnsurer from './authentication-ensurer.js';
const { Schedule } = db;
const router = express.Router();

router.get('/index', authenticationEnsurer, (req, res, next) =>
  (async () => {
    const schedules = await Schedule.findAll({
      order: [['"updatedAt"', 'DESC']],
    }).then((schedules) =>
      schedules.map((s) => ({
        scheduleId: s.scheduleId,
        scheduleName: s.scheduleName,
        memo: s.memo,
        createdBy: s.createdBy,
        updatedAt: s.updatedAt,
      }))
    );
    res.json({
      user: { userId: Number(req.user.id), username: req.user.username },
      schedules,
    });
  })().catch(next)
);
router.get('/logout', (req, res, next) =>
  (async () => {
    // id:0に特殊な意味をもたせてみる
    const userId = req.user ? Number(req.user.id) : 0;
    req.logout();
    res.json({ status: 'OK', userId });
  })().catch(next)
);

export default router;
