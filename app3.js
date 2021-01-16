'use strict';

require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
//const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host: process.env.MAIL_HOST,
//   port: process.env.MAIL_PORT,
//   secure: process.env.MAIL_SECURE,
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.MAIL_PASS,
//   },
// });
// const mailData = {
//   from: 'suiran256@gmail.com',
//   to: 'suiran256@gmail.com',
//   text: 'texttest',
//   subject: 'test',
// };

const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const schedulesRouter = require('./routes/schedules');
const availabilitiesRouter = require('./routes/availabilities');
const commentsRouter = require('./routes/comments');

const User = require('./models/index').User;

const app = express();
app.use(logger('dev'));
app.use(helmet());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const GitHubStrategy = require('passport-github2').Strategy;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/github/callback',
    function(accessToken, refreshToken, profile, done) {
      process.nextTick(() => {
        User.upsert({
          userID: profile.id,
          username: profile.username,
        })
          .then(() => done(null, profile))
          .catch(done);
      });
    },
  })
);
app.use(
  session({
    secret: 'aaa',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/schedules', schedulesRouter);
app.use('/schedules', availabilitiesRouter);
app.use('/schedules', commentsRouter);

app.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  () => {}
);
app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    const loginFrom = req.cookies.loginFrom;
    if (
      loginFrom &&
      !loginFrom.includes('http://') &&
      !loginFrom.includes('https://')
    ) {
      res.clearCookie('loginFrom');
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
  }
);

app.use((req, res, next) => {
  next(createError(404));
});

/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status = err.status || 500;
  res.redirect('error');
});

module.exports = app;
