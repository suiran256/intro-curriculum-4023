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

const fetchCreateCandidates = (req, scheduleId) => async () => {
  const candidateNamesStr = req.body.candidates || '';
  const candidates = candidateNamesStr
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map((name) => ({ candidateName: name, scheduleId: scheduleId }));
  return await Candidate.bulkCreate(candidates);
};

const isUpdatable = (schedule, req) =>
  schedule && schedule.createdBy === Number(req.user.id);

const deleteScheduleAggregate = async (scheduleId) => {
  const fetchDeleteAtModel = (Model) =>
    Model.findAll({ where: { scheduleId } })
      .then((elements) => elements.map((elem) => elem.destroy()))
      .then(Promise.all);
  const fetchDeleteAtSchedule = () => Schedule.findByPk(scheduleId);
  await Promise.all([
    fetchDeleteAtModel(Availability).then(() => fetchDeleteAtModel(Candidate)),
    fetchDeleteAtModel(Comment),
  ]);
  await fetchDeleteAtSchedule();
};

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const scheduleId = uuid.v4();
  const updatedAt = new Date();
  Schedule.create({
    scheduleId: scheduleId,
    scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
    memo: req.body.memo.slice(0, 255) || 'noMemo',
    createdBy: req.user.id,
    updatedAt: updatedAt,
  })
    .then(() => {
      return fetchCreateCandidates(req, scheduleId).then(() => {
        res.redirect(`/schedules/${scheduleId}`);
      });
    })
    .catch(next);
});

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  (async () => {
    const scheduleId = req.params.scheduleId;
    const userIdMe = Number(req.user.id);
    const userMe = { userId: userIdMe, username: req.user.username };
    const schedule = await Schedule.findByPk(scheduleId, {
      include: { model: User, attributes: ['userId', 'username'] },
    });
    if (!scheduleId) throw createError(404, 'notFound');

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
        order: [
          [User, '"username"', 'ASC'],
          ['"candidateId"', 'ASC'],
        ],
      });
      availabilities.forEach((a) => {
        const userId = a.User.userId;
        const candidateId = a.candidateId;
        const map = availabilityMapMap.get(candidateId) || new Map();
        map.set(candidateId, a.availability);
        availabilityMapMap.set(userId, map);
        userMapWork.set(userId, a.User);
      });
      userMapWork.delete(userIdMe);
      return { availabilityMapMap, userMap: userMapWork };
    };
    const fetchCommentMap = async () => {
      const commentMap = new Map();
      const comments = await Comment.findAll({
        where: { scheduleId: scheduleId },
      });
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return commentMap;
    };
    const [
      candidates,
      { availabilityMapMap, userOtherMap },
      commentMap,
    ] = await Promise.all([
      fetchCandidates(),
      fetchAvailabilityMapMapANDUserMap(),
      fetchCommentMap(),
    ]);
    res.render('schedule', {
      user: req.user,
      schedule: schedule,
      userMe,
      candidates,
      availabilityMapMap,
      userMap: userOtherMap,
      commentMap,
    });
  })().catch(next);
});

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
  (req, res, next) => {
    (async () => {
      const scheduleId = req.params.scheduleId;
      const schedule = await Schedule.findByPk(scheduleId, {
        include: { model: User, attributes: ['useId', 'username'] },
      });
      if (!isUpdatable(schedule, req)) throw createError(404, 'notFound');

      const fetchEdit = async () => {
        const updatedAt = new Date();
        await schedule.update({
          scheduleName: req.body.scheduleName.slice(0, 255) || 'noName',
          memo: req.body.memo.slice(0, 255) || 'noMemo',
          updatedAt,
        });
        await fetchCreateCandidates(req, scheduleId);
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
