//* eslint-disable no-unused-vars */
//
'use strict';
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const express = require('express');
const logger = require('morgan');
const helmet = require('helmet');

const passport = require('passport');
const { User } = require('./models/index');
const session = require('express-session');
const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const schedulesRouter = require('./routes/schedules');
const availabilitiesRouter = require('./routes/availabilities');
const commentsRouter = require('./routes/comments');
const SESSION_SECRET = process.env.SESSION_SECRET;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK = process.env.GITHUB_CALLBACK;
const GithubStrategy = require('passport-github2').Strategy;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
passport.use(
  new GithubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: GITHUB_CALLBACK,
    },
    (accessToken, refreshToken, profile, done) => {
      User.upsert({ userId: profile.id, username: profile.username }).then(() =>
        done(null, profile)
      );
    }
  )
);

const app = express();
app.use(logger('dev'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));
app.use(
  session({ secret: SESSION_SECRET, resave: false, saveUninitialized: false })
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

app.use((req, res, next) => next(createError(404, 'notFound')));
/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  const message = err.message;
  const error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', { message, error });
});

module.exports = app;
