/* eslint no-unused-vars: 2 */
import express from 'express';

export default function authGithub(passport) {
  const router = express.Router();

  router.get(
    '/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );
  router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
      const { loginFrom } = req.cookies;
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
  return router;
}
