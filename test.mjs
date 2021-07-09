/* eslint no-unused-vars: 0 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import httpErrors from 'http-errors';
import express from 'express';
import logger from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GithubStrategy } from 'passport-github2';
import db from './models/index';
import indexRouter from './routes/index';
import loginRouter from './routes/login';
import logoutRouter from './routes/logout';
import schedulesRouter from './routes/schedules';
import availabilitiesRouter from './routes/availabilities';
import commentsRouter from './routes/comments';
import authGithubRouter from './routes/authGithub.mjs';
