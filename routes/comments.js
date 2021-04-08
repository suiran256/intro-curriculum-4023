'use strict';
const authenticationEnsurer = require('./authentication-ensurer');
const express = require('express');
const router = express.Router();

const { Comment } = require('../models/index');

function fetchUpsertComment(req, res, next) {
  (async () => {
    const scheduleId = req.params.scheduleId;
    const userId = req.params.userId;
    const comment = req.body.comment;

    await Comment.upsert({
      scheduleId: scheduleId,
      userId: userId,
      comment: comment.slice(0, 255),
    });
    res.json({ status: 'OK', comment: comment });
  })().catch(next);
}
router.post(
  '/:scheduleId/users/:userId/comments',
  authenticationEnsurer,
  fetchUpsertComment
);

module.exports = router;
