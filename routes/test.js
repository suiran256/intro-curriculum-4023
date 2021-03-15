/* eslint-disable no-unused-vars */
'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const User = require('../models/user');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const Availability = require('../models/availability');
const Comment = require('../models/comment');
const csrfProtection = require('csurf')({ cookie: true });

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
  const scheduleId = uuid.v4();
  const updatedAt = new Date();
  Schedule.create({
    userId: req.user.id,
    scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt,
  }).then(() => {
    createCandidatesAndRedirect(parseCandidateNames(req), scheduleId, res);
  });
});

router.get(':/scheduleId', authenticationEnsurer, (req, res, next) => {
  let storedSchedule = null;
  let storedCandidates = null;
  Schedule.findOne({
    include: [
      {
        model: User,
        attributes: ['userId', 'username'],
      },
    ],
    where: { scheduleId: req.params.scheduleId },
  }).then((schedule) => {
    if (!schedule) return next(new Error(404, 'notFound'));
    storedSchedule = schedule;
    return Candidate.findAlL({
      where: { scheduleId: schedule.scheduleId },
      order: [['candidateId', 'ASC']],
    }).then((candidates) => {
      storedCandidates = candidates;
      return Availability.findAll({
        include: [
          {
            model: User,
            attributes: ['userId', 'username'],
          },
        ],
        where: { scheduleId: storedSchedule.scheduleId },
        order: [
          [User, '"username"', 'ASC'],
          ['"candidateId"', 'ASC'],
        ],
      }).then((availabilities) => {
        const availabilityMapMap = new Map();
      });
    });
  });
});

function createCandidatesAndRedirect(candidateNames, scheduleId, res) {}
function parseCandidateNames(req) {}
