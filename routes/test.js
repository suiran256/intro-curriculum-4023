//* eslint-disable no-unused-vars */
'use strict';

const uuid = require('uuid');
const createError = require('http-errors');
const express = require('express');
const authenticationEnsurer = require('./authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });
const {
  User,
  Schedule,
  Availability,
  Candidate,
  Comment,
} = require('../models/index');
const router = express.Router();

function createCandidates(req, scheduleId) {
  return (async () => {
    const candidates = (req.body.candidates || '')
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
//scheduleが存在しているのを確認済前提
function deleteScheduleAggregate(schedule) {
  return (async () => {
    const scheduleId = schedule.scheduleId;
    const deleteAllAtModel = (Model) =>
      (async () => {
        const elements = await Model.findAll({ where: { scheduleId } });
        const promises = elements.map((elem) => elem.destroy());
        await Promise.all(promises);
        return;
      })();
    await Promise.all([
      deleteAllAtModel(Availability).then(() => deleteAllAtModel(Candidate)),
      deleteAllAtModel(Comment),
    ]);
    await schedule.destroy();
    return;
  })();
}

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render({ user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) =>
  (async () => {
    const scheduleId = uuid.v4();

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

router.get('/:schedule', authenticationEnsurer, (req, res, next) =>
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
      const availabilities = Availability.findAll({
        include: { model: User, attributes: ['userId', 'username'] },
        where: { scheduleId },
        order: [[User, '"username"', 'ASC']],
      });
      availabilities.forEach((a) => {
        const map = availabilityMapMap.get(a.userId) || new Map();
        map.set(a.candidateId, a.availability);
        availabilityMapMap.set(a.userId);
        userMapWork.set(a.userId, a.User);
      });
      userMapWork.delete(userIdMe);
      return { availabilityMapMap, userMe, userOtherMap: userMapWork };
    };
    const [
      candidates,
      commentMap,
      { availabilityMapMap, userMe, userOtherMap },
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

      userMe,
      userOtherMap,
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

      const asyncEdit = async () => {
        await schedule.update({
          scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
          memo: req.body.memo.slice(0, 255) || 'noMemo',
          updatedAt: new Date(),
        });
        await createCandidates(req, scheduleId);
        res.redirect(`/schedules/${scheduleId}`);
      };
      const asyncDelete = async () => {
        await deleteScheduleAggregate(schedule);
        res.redirect('/');
      };
      if (Number(req.query.edit) === 1) {
        return asyncEdit().catch(next);
      } else if (Number(req.query.delete) === 1) {
        return asyncDelete().catch(next);
      } else {
        return next(createError(400, 'badRequest'));
      }
    })().catch(next)
);

router.deleteScheduleAggregate = deleteScheduleAggregate;
module.exports = router;
