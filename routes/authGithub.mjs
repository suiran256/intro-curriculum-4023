/* eslint no-unused-vars: 2 */
import express from 'express';
import path from 'path';

export default function authGithub(passport) {
  const router = express.Router();
  const { FRONT_URL } = process.env;

  router.get(
    '/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );
  router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
      // const { loginFrom } = req.cookies;
      // if (
      //   loginFrom &&
      //   !loginFrom.includes('http://') &&
      //   !loginFrom.includes('https://')
      // ) {
      //   res.clearCookie('loginFrom');
      //   res.redirect(loginFrom);
      // } else {
      //   res.redirect('/');
      // }

      // res.redirect('http://localhost:8080/');
      res.redirect('http://localhost:8080/success');
      // res.redirect('/');
    }
  );
  return router;
}
