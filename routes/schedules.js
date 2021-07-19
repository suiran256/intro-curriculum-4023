//* eslint-disable no-unused-vars */

const authenticationEnsurer = require('./authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });
const express = require('express');

const createError = require('http-errors');

const router = express.Router();
const uuid = require('uuid');

const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');

function createCandidates(req, scheduleId) {
  return (async () => {
    const candidateNamesStr = req.body.candidates || '';
    const candidates = candidateNamesStr
      .split('\n')
      .map((s) => s.trim().slice(0, 255))
      .filter((s) => s !== '')
      .map((name) => ({ candidateName: name, scheduleId }));
    return await Candidate.bulkCreate(candidates);
  })();
}

function isUpdatable(schedule, req) {
  return schedule && schedule.createdBy === Number(req.user.id);
}

function deleteScheduleAggregate(scheduleId) {
  return (async () => {
    const fetchDeleteAtModel = async (Model) => {
      const elements = await Model.findAll({ where: { scheduleId } });
      const promises = elements.map((elem) => elem.destroy());
      return await Promise.all(promises);
    };
    const fetchDeleteAtSchedule = () =>
      Schedule.findByPk(scheduleId).then((s) => s.destroy());
    await Promise.all([
      fetchDeleteAtModel(Availability).then(() =>
        fetchDeleteAtModel(Candidate)
      ),
      fetchDeleteAtModel(Comment),
    ]);
    await fetchDeleteAtSchedule();
  })();
}

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  return (async () => {
    const scheduleId = uuid.v4();
    const updatedAt = new Date();
    await Schedule.create({
      scheduleId,
      scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
      memo: req.body.memo.slice(0, 255) || 'noMemo',
      createdBy: req.user.id,
      updatedAt,
    });
    await createCandidates(req, scheduleId);
    res.redirect(`/schedules/${scheduleId}`);
  })().catch(next);
});

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) =>
  (async () => {
    const { scheduleId } = req.params;
    const userIdMe = Number(req.user.id);
    const userMe = { userId: userIdMe, username: req.user.username };

    const schedule = await Schedule.findByPk(scheduleId, {
      include: { model: User, attributes: ['userId', 'username'] },
    });
    if (!schedule) throw createError(404, 'notFound');

    const fetchCandidates = () =>
      Candidate.findAll({
        where: { scheduleId },
        order: [['"candidateId"', 'ASC']],
      });
    const fetchAvailabilityMapMapANDUserMap = async () => {
      const availabilityMapMap = new Map();
      const userMapWork = new Map();
      const availabilities = await Availability.findAll({
        include: { model: User, attributes: ['userId', 'username'] },
        where: { scheduleId },
        order: [[User, '"username"', 'ASC']],
      });

      // const { availabilityMapMap, userMapWork } = availabilities.reduce(
      //   (acc, a) => {
      //     const map = acc.availabilityMapMap.get(a.userId) || new Map();
      //     map.set(a.candidateId, a.availability);
      //     acc.availabilityMapMap.set(a.userId, map);

      //     acc.userMapWork.set(a.userId, a.User);

      //     return acc;
      //   },
      //   { availabilityMapMap: new Map(), userMapWork: new Map() }
      // );

      availabilities.forEach((a) => {
        const { userId } = a;
        const { candidateId } = a;
        const map = availabilityMapMap.get(userId) || new Map();
        map.set(candidateId, a.availability);
        availabilityMapMap.set(userId, map);

        userMapWork.set(userId, a.User);
      });
      userMapWork.delete(userIdMe);
      return { availabilityMapMap, userOtherMap: userMapWork };
    };
    const fetchCommentMap = async () => {
      const commentMap = new Map();
      const comments = await Comment.findAll({ where: { scheduleId } });
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return commentMap;
    };

    const [candidates, { availabilityMapMap, userOtherMap }, commentMap] =
      await Promise.all([
        fetchCandidates(),
        fetchAvailabilityMapMapANDUserMap(),
        fetchCommentMap(),
      ]);
    res.render('schedule', {
      user: req.user,
      schedule,
      candidates,
      availabilityMapMap,
      userMe,
      userOtherMap,
      commentMap,
    });
  })().catch(next)
);

router.get(
  '/:scheduleId/edit',
  authenticationEnsurer,
  csrfProtection,
  (req, res, next) =>
    (async () => {
      const { scheduleId } = req.params;
      const schedule = await Schedule.findByPk(scheduleId, {
        include: { model: User, attributes: ['userId', 'username'] },
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
      const { scheduleId } = req.params;
      const schedule = await Schedule.findByPk(scheduleId, {
        include: { model: User, attributes: ['userId', 'username'] },
      });
      if (!isUpdatable(schedule, req)) throw createError(404, 'notFound');

      const fetchEdit = async () => {
        const updatedAt = new Date();
        await schedule.update({
          scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
          memo: req.body.memo.slice(0, 255) || 'noMemo',
          updatedAt,
        });
        await createCandidates(req, scheduleId);
        res.redirect(`/schedules/${scheduleId}`);
      };
      const fetchDelete = async () => {
        await deleteScheduleAggregate(scheduleId);
        res.redirect('/');
      };
      if (Number(req.query.edit) === 1) {
        return fetchEdit().catch(next);
      }
      if (Number(req.query.delete) === 1) {
        return fetchDelete().catch(next);
      }
      return next(createError(400, 'badRequest'));
    })().catch(next)
);

router.deleteScheduleAggregate = deleteScheduleAggregate;
module.exports = router;
