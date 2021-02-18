/* eslint-disable no-unused-vars */
'use strict';
const express = require('express');
const uuid = require('uuid');

const router = express.Router();
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');
const authenticationEnsurer = require('./authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', {
    user: req.user,
    csrfToken: req.csrfToken(),
  });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const scheduleId = uuid.v4();
  const updatedAt = new Date();
  Schedule.create({
    scheduleId: scheduleId,
    scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt,
  }).then(() => {
    createCandidatesAndRedirect(parseCandidateNames(req), scheduleId, res);
  });
});

router.get('/:scheduleId', authenticationEnsurer, async (req, res, next) => {
  const schedule = await Schedule.findOne({
    include: [{ model: User, attributes: ['userId', 'username'] }],
    where: { scheduleId: req.params.scheduleId },
  });
  if (!schedule) {
    const err = new Error('notFound');
    err.status = 404;
    next(err);
  }
  const candidates = await Candidate.findAll({
    where: { scheduleId: schedule.scheduleId },
    order: [['"candidateId"', 'ASC']],
  });
  const availabilities = await Availability.findAll({
    include: [{ model: User, attributes: ['userId', 'username'] }],
    where: { scheduleId: schedule.scheduleId },
    order: [
      [User, '"username"', 'ASC'],
      ['"candidateId"', 'ASC'],
    ],
  });
  const availabilityMapMap = new Map();
  availabilities.forEach((a) => {
    const map = availabilityMapMap.get(a.User.userId) || new Map();
    map.set(a.candidateId, a.availability);
    availabilityMapMap.set(a.User.userId, map);
  });
  const userMap = new Map();
  userMap.set(parseInt(req.user.id), {
    isSelf: true,
    userId: parseInt(req.user.id),
    username: req.user.username,
  });
  availabilities.forEach((a) => {
    userMap.set(a.User.userId, {
      isSelf: a.User.userId === parseInt(req.user.id),
      userId: a.User.userId,
      username: a.User.username,
    });
  });
  const users = Array.from(userMap).map((entry) => entry[1]);
  users.forEach((u) => {
    candidates.forEach((c) => {
      const map = availabilityMapMap.get(u.userId) || new Map();
      const availability = map.get(c.candidateId) || 0;
      map.set(c.candidateId, availability);
      availabilityMapMap.set(u.userId, map);
    });
  });
  const commentMap = new Map();
  const comments = await Comment.findAll({
    where: { scheduleId: schedule.scheduleId },
  });
  comments.forEach((c) => {
    commentMap.set(c.userId, c.comment);
  });
  res.render('schedule', {
    user: req.user,
    schedule: schedule,
    candidates: candidates,
    users: users,
    availabilityMapMap: availabilityMapMap,
    commentMap: commentMap,
  });
});

function createCandidatesAndRedirect(candidateNames, scheduleId, res) {}
function parseCandidateNames(req) {}
