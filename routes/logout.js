'use strict';
const express = require('express');
const router = express.Router();
// const { FRONT_URL } = process.env;

router.get('/', (req, res) => {
  req.logout();
  res.redirect('/');
  // res.redirect(FRONT_URL);
});

module.exports = router;
