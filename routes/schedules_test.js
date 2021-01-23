/* eslint-disable no-unused-vars */
'use strict';
const router = require('express').Router();
const authenticationEnsurer = require('./authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  const scheduleId = require('uuid');
  const updatedAt = new Date();
  Schedule.create({
    scheduleId: scheduleId,
    memo: req.body.memo.slice(0, 255) || 'noname',
  }).then(() => {
    const candidates = parseCandidates(req);
  });
});

async function parseCandidates(req) {
  const candidates = req.body.candidates
    .split('\n')
    .map((s) => s.trim().slice(0, 255))
    .filter((s) => s !== '')
    .map((cn) => {
      return { candidateName: cn, scheduleId: req.params.scheduleId };
    });
  Candidate.bulkCreate(candidates);
}
