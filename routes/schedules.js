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

function upsertScheduleANDCandidates(req, scheduleId) {
  return (async () => {
    const updatedAt = new Date();
    await Schedule.upsert({
      scheduleId,
      scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
      memo: req.body.memo.slice(0, 255) || 'noMemo',
      createdBy: req.user.id,
      updatedAt,
    });
    const candidates = (req.body.candidates || '')
      .split('\n')
      .map((s) => s.trim().slice(0, 255))
      .filter((s) => s !== '')
      .map((name) => ({ candidateName: name, scheduleId }));
    return await Candidate.bulkCreate(candidates);
  })();
}
function isUpdatable(schedule, req) {
  return schedule && Number(req.user.id) === schedule.createdBy;
}
function deleteScheduleAggregate(scheduleId) {
  return (async () => {
    const schedule = Schedule.findByPk(scheduleId);
    if (!schedule) throw new Error("don't exist schedule");
    const deleteAllAtModel = (Model) =>
      (async () => {
        const promises = await Model.findAll({
          where: { scheduleId },
        }).then((elements) => elements.map((elem) => elem.destroy()));
        await Promise.all(promises);
        return;
      })();
    await Promise.all([
      deleteAllAtModel(Availability).then(() => deleteAllAtModel(Candidate)),
      deleteAllAtModel(Comment),
    ]);
    await schedule.then((s) => s.destroy());
    return;
  })();
}

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) =>
  (async () => {
    const scheduleId = uuid.v4();
    await upsertScheduleANDCandidates(req, scheduleId);
    res.redirect(`/schedules/${scheduleId}`);
  })().catch(next)
);

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) =>
  (async () => {
    const scheduleId = req.params.scheduleId;
    const schedule = await Schedule.findByPk(scheduleId, {
      include: { model: User, attributes: ['userId', 'username'] },
    });
    if (!schedule) throw createError(404, 'notFound');

    const fetchCandidates = () =>
      Candidate.findAll({
        where: { scheduleId },
        order: [['"candidateId"', 'ASC']],
      });
    const fetchCommentMap = async () => {
      const commentMap = new Map();
      const comments = await Comment.findAll({ where: { scheduleId } });
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return commentMap;
    };
    const fetchAvailabilityMapMapANDUserMap = async () => {
      const availabilityMapMap = new Map();
      const userMapWork = new Map();
      const userIdMe = Number(req.user.id);
      const userMe = { userId: userIdMe, username: req.user.username };
      const availabilities = await Availability.findAll({
        include: { model: User, attributes: ['userId', 'username'] },
        where: { scheduleId },
        order: [[User, '"username"', 'ASC']],
      });
      availabilities.forEach((a) => {
        const userId = a.userId;
        const candidateId = a.candidateId;
        const map = availabilityMapMap.get(userId) || new Map();
        map.set(candidateId, a.availability);
        availabilityMapMap.set(userId, map);

        userMapWork.set(userId, a.User);
      });
      userMapWork.delete(userIdMe);
      return { userMe, userOtherMap: userMapWork, availabilityMapMap };
    };
    const [
      candidates,
      commentMap,
      { userMe, userOtherMap, availabilityMapMap },
    ] = await Promise.all([
      fetchCandidates(),
      fetchCommentMap(),
      fetchAvailabilityMapMapANDUserMap(),
    ]);
    res.render('schedule', {
      user: req.user,
      schedule,
      candidates,
      userOtherMap,
      userMe,
      availabilityMapMap,
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
      const scheduleId = req.params.scheduleId;
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
      const scheduleId = req.params.scheduleId;
      const schedule = await Schedule.findByPk(scheduleId, {
        include: { model: User, attributes: ['userId', 'username'] },
      });
      if (!isUpdatable(schedule, req)) throw createError(404, 'notFound');

      const fetchEdit = () =>
        upsertScheduleANDCandidates(req, scheduleId).then(() => {
          res.redirect(`/schedules/${scheduleId}`);
        });
      const fetchDelete = () =>
        deleteScheduleAggregate(scheduleId).then(() => {
          res.redirect('/');
        });
      if (Number(req.query.edit) === 1) {
        return fetchEdit().catch(next);
      } else if (Number(req.query.delete) === 1) {
        return fetchDelete().catch(next);
      } else {
        return next(createError(400, 'badRequest'));
      }
    })().catch(next)
);

router.deleteScheduleAggregate = deleteScheduleAggregate;
module.exports = router;
