/* eslint no-unused-vars: 2 */
import { config as dotenvConfig } from 'dotenv';
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import logger from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GithubStrategy } from 'passport-github2';
import db from './models/index.js';
import indexRouter from './routes/index.js';
import loginRouter from './routes/login.js';
import logoutRouter from './routes/logout.js';
import schedulesRouter from './routes/schedules.js';
import availabilitiesRouter from './routes/availabilities.js';
import commentsRouter from './routes/comments.js';
import authGithubRouter from './routes/authGithub.mjs';

dotenvConfig();
const {
  SESSION_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK,
} = process.env;
const dirname = path.dirname(new URL(import.meta.url).pathname);
const { User } = db;
const app = express();

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
passport.use(
  new GithubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: GITHUB_CALLBACK,
    },
    (accessToken, refreshToken, profile, done) =>
      User.upsert({ userId: profile.id, username: profile.username })
        .then(() => done(null, profile))
        .catch(done)
  )
);

app.set('views', path.join(dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(dirname, 'public')));
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
app.use('/auth', authGithubRouter(passport));

app.use((req, res, next) => next(createError(404, 'notFound')));
/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  const { message } = err;
  const error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', { message, error });
});

export default app;
