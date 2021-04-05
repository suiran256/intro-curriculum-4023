//* eslint-disable no-unused-vars */
'use strict';
const express = require('express');
const router = express.Router();
const uuid = require('uuid');
const createError = require('http-errors');
const authenticationEnsurer = require('./authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');

function createCandidates(req, scheduleId) {
  (async () => {
    const candidateNamesStr = req.body.candidates || '';
    const candidates = candidateNamesStr
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .map((name) => ({ candidateName: name, scheduleId: scheduleId }));
    return await Candidate.bulkCreate(candidates);
  })();
}
function isUpdatable(schedule, req) {
  return schedule && Number(req.user.id) === schedule.createdBy;
}
function deleteScheduleAggregate(scheduleId) {
  const asyncDeleteAvailability = () =>
    Availability.findAll({
      where: { scheduleId: scheduleId },
    })
      .then((availabilities) => availabilities.map((a) => a.destroy()))
      .then((promises) => Promise.all(promises));

  const asyncDeleteCandidate = () =>
    Candidate.findAll({ where: { scheduleId: scheduleId } })
      .then((candidates) => candidates.map((c) => c.destroy()))
      .then((promises) => Promise.all(promises));
  const asyncDeleteComment = () =>
    Comment.findAll({ where: { scheduleId: scheduleId } })
      .then((comments) => comments.map((c) => c.destroy()))
      .then((promises) => Promise.all(promises));
  const asyncDeleteSchedule = () =>
    Schedule.findByPk(scheduleId).then((s) => s.destroy());

  return Promise.all([
    asyncDeleteAvailability().then(asyncDeleteCandidate),
    asyncDeleteComment(),
  ]).then(asyncDeleteSchedule);
}

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  (async () => {
    const scheduleId = uuid.v4();
    const updatedAt = new Date();
    await Schedule.create({
      scheduleId: scheduleId,
      scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
      memo: req.body.memo,
      createdBy: req.user.id,
      updatedAt: updatedAt,
    });
    await createCandidates(req, scheduleId);
    res.redirect(`/schedules/${scheduleId}`);
  })().catch(next);
});

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  (async () => {
    const scheduleId = req.params.scheduleId;
    const schedule = await Schedule.findByPk(scheduleId, {
      include: { model: User, attributes: ['userId', 'username'] },
    });
    if (!schedule) throw createError(404, 'notFound');

    const promiseCandidates = Candidate.findAll({
      where: { scheduleId: scheduleId },
      order: [['"candidateId"', 'ASC']],
    });
    const promiseMapOfAvailabilityAndUser = (async () => {
      const userIdMe = Number(req.user.id);
      const userMe = {
        userId: userIdMe,
        username: req.user.username,
      };
      const availabilities = await Availability.findAll({
        include: { model: User, attributes: ['userId', 'username'] },
        where: { scheduleId: scheduleId },
        order: [[User, '"username"', 'ASC']],
      });
      const availabilityMapMap = new Map();
      const userMapWork = new Map();
      availabilities.forEach((a) => {
        const userId = a.User.userId;
        const candidateId = a.candidateId;
        const map = availabilityMapMap.get(userId) || new Map();
        map.set(candidateId, a.availability);
        availabilityMapMap.set(userId, map);
        userMapWork.set(userId, a.User);
      });
      userMapWork.delete(userIdMe);
      const userOtherMap = userMapWork;
      return { userMe, userOtherMap, availabilityMapMap };
    })();
    const promiseMapOfComment = (async () => {
      const commentMap = new Map();
      const comments = await Comment.findAll({
        where: { scheduleId: scheduleId },
      });
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return { commentMap };
    })();

    const [
      candidates,
      { userMe, userOtherMap, availabilityMapMap },
      { commentMap },
    ] = await Promise.all([
      promiseCandidates,
      promiseMapOfAvailabilityAndUser,
      promiseMapOfComment,
    ]);
    res.render('schedule', {
      user: req.user,
      schedule,
      candidates,
      userMe,
      userMap: userOtherMap,
      availabilityMapMap,
      commentMap,
    });
  })().catch(next);
});

router.get(
  '/:scheduleId/edit',
  authenticationEnsurer,
  csrfProtection,
  (req, res, next) => {
    (async () => {
      const scheduleId = req.params.scheduleId;
      const schedule = await Schedule.findByPk(scheduleId);
      if (!isUpdatable(schedule, req)) throw createError(404, 'notFound');
      const candidates = await Candidate.findAll({
        where: { scheduleId: scheduleId },
        order: [['"candidateId"', 'ASC']],
      });
      res.render('edit', {
        user: req.user,
        schedule,
        candidates,
        csrfToken: req.csrfToken(),
      });
    })().catch(next);
  }
);

router.post(
  '/:scheduleId',
  authenticationEnsurer,
  csrfProtection,
  (req, res, next) => {
    (async () => {
      const scheduleId = req.params.scheduleId;
      const updatedAt = new Date();
      const schedule = await Schedule.findByPk(scheduleId);
      if (!isUpdatable(schedule, req)) throw createError(404, 'notFound');

      if (Number(req.query.edit) === 1) {
        return (async () => {
          await schedule.update({
            scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
            memo: req.body.memo,
            updatedAt: updatedAt,
          });
          await createCandidates(req, scheduleId);
          res.redirect(`/schedules/${scheduleId}`);
        })().catch(next);
      } else if (Number(req.query.delete) === 1) {
        return deleteScheduleAggregate(scheduleId)
          .then(() => {
            res.redirect('/');
          })
          .catch(next);
      } else {
        next(createError(400, 'badRequest'));
      }
    })().catch(next);
  }
);

// module.exports = { ...router, deleteScheduleAggregate };
router.deleteScheduleAggregate = deleteScheduleAggregate;
module.exports = router;
