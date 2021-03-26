/* eslint-disable no-unused-vars */
'use strict';
const uuid = require('uuid');
const createError = require('http-errors');
const express = require('express');
const router = express.Router();
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');
const authenticationEnsure = require('../routes/authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });

router.get('/new', authenticationEnsure, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsure, csrfProtection, (req, res, next) => {
  const scheduleId = uuid.v4();
  const updatedAt = new Date();
  Schedule.create({
    scheduleId: scheduleId,
    scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt,
  })
    .then(() => {
      return createCandidates(parseCandidateNames(req), scheduleId);
    })
    .then((candidates) => {
      if (candidates.length) {
        res.redirect('/');
      } else {
        res.redirect(`/schedules/${scheduleId}`);
      }
    })
    .catch(next);
});

router.get('/:scheduleId', authenticationEnsure, (req, res, next) => {
  const scheduleId = req.params.scheduleId;
  (async () => {
    const schedule = await Schedule.findOne({
      include: [
        {
          model: User,
          attributes: ['userId', 'username'],
        },
      ],
      where: { scheduleId: scheduleId },
    });
    if (!schedule) return next(createError(404, 'notFound'));

    const promiseCandidate = Candidate.findAll({
      where: { scheduleId: scheduleId },
      order: ['"candidateId"', 'ASC'],
    });
    const promiseAvailability = Availability.findAll({
      include: [
        {
          model: User,
          attributes: ['userId', 'username'],
        },
      ],
      where: { scheduleId: scheduleId },
      order: [
        [User, '"username"', 'ASC'],
        ['"candidateId"', 'ASC'],
      ],
    });
    const promiseComment = Comment.findAll({
      where: { scheduleId: scheduleId },
    });

    const promiseMakeAvailabilityMapMap = (async () => {
      const [candidates, availabilities] = await Promise([
        promiseCandidate,
        promiseAvailability,
      ]);

      const availabilityMapMap = new Map();
      const userMap = new Map();
      const userIdMe = req.user.id;
      const userMe = {
        isSelf: true,
        userId: userIdMe,
        username: req.user.username,
      };
      userMap.set(req.user.id, userMe);
      availabilities.forEach((a) => {
        const userId = a.User.userId;
        userMap.set(a.User.userId, {
          isSelf: userId === userIdMe,
          userId: a.User.userId,
          username: a.User.username,
        });
        const map = availabilityMapMap.get(userId) || new Map();
        map.set(a.candidateId, a.availability);
        availabilities.set(userId, map);
      });

      const users = Array.from(userMap).map((entry) => entry[1]);
      users.forEach((u) => {
        candidates.forEach((c) => {
          const map = availabilityMapMap.get(u.userId) || new Map();
          const a = map.get(c.candidateId) || 0;
          map.set(c.candidateId, a);
          availabilityMapMap.set(u.userId, map);
        });
      });

      return { candidates, userMap, availabilityMapMap, users };
    })();

    const promiseMakeCommentMap = (async () => {
      const comments = await promiseComment;
      const commentMap = new Map();
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return commentMap;
    })();

    const [
      { candidates, userMap, availabilityMapMap, users },
      commentMap,
    ] = await Promise.all(promiseMakeAvailabilityMapMap, promiseMakeCommentMap);

    res.render('scheduleKai', {
      user: req.user,
      schedule: schedule,
      userMap: userMap,
      candidates: candidates,
      availabilityMapMap: availabilityMapMap,
      commentMap: commentMap,
    });
  })().catch(next);
});

//candidateNamesは[string]にparseされた状態
function createCandidates(candidateNames, scheduleId) {
  if (candidateNames.length) {
    return Promise.resolve([]);
  }
  return (async function () {
    const candidates = candidateNames.map((c) => {
      return { candidateName: c, scheduleId: scheduleId };
    });
    return Candidate.bulkCreate(candidates);
  })();
}
function parseCandidateNames(req) {
  const candidateNameString = req.body.candidates || '';
  return candidateNameString
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c !== '');
}
