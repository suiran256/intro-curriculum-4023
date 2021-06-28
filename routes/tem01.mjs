/* eslint no-unused-vars: 2 */
import express from 'express';
import createError from 'http-errors';
import { v4 as uuidV4 } from 'uuid';
import csrf from 'csurf';
import authenticationEnsurer from './authentication-ensurer.js';
import db from '../models/index.js';

const csrfProtection = csrf({ cookie: true });
const { User, Schedule, Candidate, Availability, Comment } = db;
const router = express.Router();

async function createCandidates(req, scheduleId) {
  const candidates = (req.body.candidates || '')
    .split('\n')
    .map((s) => s.trim().slice(0, 255))
    .filter((s) => s !== '')
    .map((name) => ({ candidateName: name, scheduleId }));
  return await Candidate.bulkCreate(candidates);
}
function isUpdatable(schedule, req) {
  return schedule && schedule.createdBy === Number(req.user.id);
}
async function deleteScheduleAggregate(schedule) {
  const deleteElements = async (Model) => {
    const promises = await Model.findAll({
      where: { scheduleId: schedule.scheduleId },
    }).then((elements) => elements.map((elem) => elem.destroy()));
    await Promise.all(promises);
  };
  await Promise.all([
    deleteElements(Availability).then(() => deleteElements(Candidate)),
    deleteElements(Comment),
  ]);
  await schedule.destroy();
}

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) =>
  (async () => {
    const scheduleId = uuidV4();
    await Schedule.create({
      scheduleId,
      scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
      memo: req.body.memo.slice(0, 255) || 'noMemo',
      createdBy: req.user.id,
      updatedAt: new Date(),
    });
    await createCandidates(req, scheduleId);
    res.redirect(`/schedules/${scheduleId}`);
  })().catch(next)
);

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) =>
  (async () => {
    const scheduleId = req.params.scheduleId;
    const schedule = await Schedule.findByPk(scheduleId, {
      include: { model: User, attributes: ['username'] },
    });
    if (!schedule) throw createError(404, 'notFound');

    const fetchCandidates = () =>
      Candidate.findAll({
        where: { scheduleId },
        order: [['"candidateId"', 'ASC']],
      });
    const fetchCommentMap = async () => {
      const commentMap = new Map();
      const comments = await Comment.findAll({
        where: { scheduleId },
      });
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return commentMap;
    };
    const fetchAvailabilityMapMapANDUserMap = async () => {
      const availabilityMapMap = new Map();
      const userMap = new Map();
      const availabilities = await Availability.findAll({
        include: { model: User, attributes: ['userId'] },
        where: { scheduleId },
        order: [[User, '"username"', 'ASC']],
      });
      availabilities.forEach((a) => {
        const userId = a.userId;
        const map = availabilityMapMap.get(userId) || new Map();
        map.set(a.candidateId, a.availability);
        availabilityMapMap.set(userId, map);

        userMap.set(userId, a.User);
      });
      return { availabilityMapMap, userMap };
    };
    const [
      candidates,
      commentMap,
      { availabilityMapMap, userMap },
    ] = await Promise.all([
      fetchCandidates(),
      fetchCommentMap(),
      fetchAvailabilityMapMapANDUserMap(),
    ]);
    res.render('schedule', {
      user: req.user,
      schedule,
      candidates,
      commentMap,
      availabilityMapMap,
      userMap,
    });
  })().catch(next)
);

router.get(
  '/:scheduleId/edit',
  authenticationEnsurer,
  csrfProtection,
  (req, res, next) =>
    (async () => {
      const scheduleId = req.params.scheduleId;
      const schedule = await Schedule.findByPk(scheduleId, {
        include: { model: User, attributes: ['username'] },
      });
      if (!isUpdatable(schedule, req)) throw createError(404, 'notFound');

      const candidates = await Candidate.findAll({
        where: { scheduleId },
        order: [['"candidateId"', 'ASC']],
      });
      res.render('edit', {
        user: req.user,
        schedule,
        candidates,
        csrfToken: req.csrfToken(),
      });
    })().catch(next)
);

router.post(
  '/:scheduleId',
  authenticationEnsurer,
  csrfProtection,
  (req, res, next) =>
    (async () => {
      const scheduleId = req.params.scheduleId;
      const schedule = await Schedule.findByPk(scheduleId);
      if (!isUpdatable(schedule, req)) throw createError(404, 'notFound');

      const editAsync = async () => {
        await schedule.update({
          scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
          memo: req.body.memo.slice(0, 255) || 'noMemo',
          updatedAt: new Date(),
        });
        await createCandidates(req, scheduleId);
        res.redirect(`/schedules/${scheduleId}`);
      };
      const deleteAsync = async () => {
        await deleteScheduleAggregate(schedule);
        res.redirect('/');
      };
      if (Number(req.query.edit) === 1) {
        return editAsync().catch(next);
      } else if (Number(req.query.delete) === 1) {
        return deleteAsync().catch(next);
      } else {
        throw createError(400, 'badRequest');
      }
    })().catch(next)
);

router.deleteScheduleAggregate = deleteScheduleAggregate;
export default router;
