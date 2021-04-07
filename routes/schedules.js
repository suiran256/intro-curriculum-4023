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

function fetchCreateCandidates(req, scheduleId) {
  return async () => {
    const candidateNamesStr = req.body.candidates || '';
    const candidates = candidateNamesStr
      .split('\n')
      .map((s) => s.trim().slice(0, 255))
      .filter((s) => s !== '')
      .map((name) => ({ candidateName: name, scheduleId: scheduleId }));
    return await Candidate.bulkCreate(candidates);
  };
}
function isUpdatable(schedule, req) {
  return schedule && Number(req.user.id) === schedule.createdBy;
}
function deleteScheduleAggregate(scheduleId) {
  const fetchDeleteAll = (Model) =>
    Model.findAll({
      where: { scheduleId: scheduleId },
    })
      .then((elements) => elements.map((element) => element.destroy()))
      .then((promises) => Promise.all(promises));

  const fetchDeleteSchedule = () =>
    Schedule.findByPk(scheduleId).then((s) => s.destroy());

  return Promise.all([
    fetchDeleteAll(Availability).then(() => fetchDeleteAll(Candidate)),
    fetchDeleteAll(Comment),
  ]).then(fetchDeleteSchedule);
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
      scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
      memo: req.body.memo.slice(0, 255) || 'noMemo',
      createdBy: req.user.id,
      updatedAt: updatedAt,
    });
    await fetchCreateCandidates(req, scheduleId)();
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

    const fetchCandidates = () =>
      Candidate.findAll({
        where: { scheduleId: scheduleId },
        order: [['"candidateId"', 'ASC']],
      });
    const fetchAvailabilityMapMapANDUserMap = async () => {
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
    };
    const fetchCommentMap = async () => {
      const commentMap = new Map();
      const comments = await Comment.findAll({
        where: { scheduleId: scheduleId },
      });
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return { commentMap };
    };

    const [
      candidates,
      { userMe, userOtherMap, availabilityMapMap },
      { commentMap },
    ] = await Promise.all([
      fetchCandidates(),
      fetchAvailabilityMapMapANDUserMap(),
      fetchCommentMap(),
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

      const fetchEdit = async () => {
        await schedule.update({
          scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
          memo: req.body.memo,
          updatedAt: updatedAt,
        });
        await fetchCreateCandidates(req, scheduleId)();
        res.redirect(`/schedules/${scheduleId}`);
      };
      const fetchDelete = async () => {
        await deleteScheduleAggregate(scheduleId);
        res.redirect('/');
      };

      if (Number(req.query.edit) === 1) {
        return fetchEdit().catch(next);
      } else if (Number(req.query.delete) === 1) {
        return fetchDelete().catch(next);
      } else {
        return next(createError(400, 'badRequest'));
      }
    })().catch(next);
  }
);

router.deleteScheduleAggregate = deleteScheduleAggregate;
module.exports = router;
