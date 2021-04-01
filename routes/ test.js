'use strict';
const express = require('express');
const router = express.Router();
const uuid = require('uuid');
const createError = require('http-errors');
const authenticationEnsurer = require('./authentication-ensurer');
const csrfProtection = requrie('csurf')({ cookie: true });

const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
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
  })
    .then(() => {
      createCandidates(req, scheduleId);
    })
    .then(() => {
      res.redirect(`/schedules/${scheduleId}`);
    })
    .catch(next);
});

function createCandidates(req, scheduleId) {
  return (async () => {
    const candidateNames = (req.body.candidates || '')
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name !== '');
    const candidates = candidateNames.map((name) => ({
      candidateName: name,
      scheduleId: scheduleId,
    }));
    return await Candidate.bulkCreate(candidates);
  })();
}

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  (async () => {
    const scheduleId = req.params.scheduleId;
    const schedule = await Schedule.findByPk(scheduleId, {
      include: { model: User, attributes: ['userId', 'username'] },
    });
    if (!schedule) throw createError(404, 'notFound');
    const candidates = await Candidate.findAll({
      where: { scheduleId: scheduleId },
      order: [['"candidateId"', 'ASC']],
    });
    const availabilities = await Availability.findAll({
      include: { model: User, attributes: ['userId', 'username'] },
      where: { scheduleId: scheduleId },
      order: [[User, '"username"', 'ASC']],
    });
    const displayStrategy = new DisplayBymap();
    availabilies.forEach((a) => {});
  })().catch(next);
});

function DisplayBymap() {
  const mapMap = new Map();
}
