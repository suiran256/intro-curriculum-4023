'use strict';
const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const { Schedule } = require('../models/index');
// const Schedule= require('../models/schedule');

const path = require('path');
const fs = require('fs');
const cors = require('cors');
// const corsOptions = {
//   origin: '*',
// };
router.get('/img/:filename', cors(), (req, res, next) => {
  fs.readFile(
    path.join(__dirname, `/img/${req.params.filename}`),
    function (err, data) {
      if (err) return next(err);
      res.set('Content-Type', 'image/jpeg');
      res.send(data);
    }
  );
});

router.get('/', (req, res) => {
  const title = 'title';
  if (req.user) {
    Schedule.findAll({
      order: [['"updatedAt"', 'DESC']],
    }).then((schedules) => {
      schedules.forEach((schedule) => {
        schedule.formattedUpdatedAt = moment(schedule.updatedAt)
          .tz('Asia/Tokyo')
          .format('YYYY/MM/DD HH:mm');
      });
      res.render('index', {
        title: title,
        user: req.user,
        schedules: schedules,
      });
    });
  } else {
    res.render('index', { title: title, user: req.user });
  }
});

module.exports = router;
