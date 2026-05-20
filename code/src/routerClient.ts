import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DAL from './DAL.js';
import Config from './Config.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import errorHandler from 'errorhandler';
import type { SurfSession } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Google OAuth strategy
passport.use(new GoogleStrategy(
  {
    clientID: Config.googleId,
    clientSecret: Config.googleSecret,
    callbackURL: Config.hostName + '/auth/google/callback',
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
  },
  (_accessToken, _refreshToken, profile, done) => {
    process.nextTick(() => {
      return done(null, profile);
    });
  }
));

const router = express.Router();

// Client directories - dist folders from both clients
const clientDirs = ['client/dist', 'client-react/dist'];

// Get base path (go up from code/dist to project root)
const basePath = path.resolve(__dirname, '../..');

for (const clientDir of clientDirs) {
  const clientDirPath = path.join(basePath, clientDir);
  router.use('/css', express.static(path.join(clientDirPath, 'css')));
  router.use('/js', express.static(path.join(clientDirPath, 'js')));
  router.use('/images', express.static(path.join(clientDirPath, 'images')));
  router.use('/fonts', express.static(path.join(clientDirPath, 'fonts')));
  router.use('/assets', express.static(path.join(clientDirPath, 'assets')));
}

let clientIndexHtmlBackbone = '';
let clientIndexHtmlReact = '';
const cacheClientIndexHtml = true;

function shouldUseBackbone(req: Request): boolean {
  return req.cookies?.['client-version'] === 'backbone' ||
         process.env.CLIENT_VERSION === 'backbone';
}

// Route to enable React client (default)
router.get('/use-react', (_req: Request, res: Response) => {
  res.clearCookie('client-version');
  res.redirect('/');
});

// Route to opt back into the legacy Backbone client
router.get('/use-backbone', (_req: Request, res: Response) => {
  res.cookie('client-version', 'backbone', {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    httpOnly: true,
    sameSite: 'lax',
  });
  res.redirect('/');
});

router.get('/', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/google');
  }

  const useBackbone = shouldUseBackbone(req);
  const clientDir = useBackbone ? clientDirs[0] : clientDirs[1];
  const cachedHtml = useBackbone ? clientIndexHtmlBackbone : clientIndexHtmlReact;

  if (!cachedHtml || !cacheClientIndexHtml) {
    const indexPath = path.join(basePath, clientDir, 'index.html');
    fs.readFile(indexPath, { encoding: 'utf-8' }, (err, data) => {
      if (!err) {
        if (useBackbone) {
          clientIndexHtmlBackbone = data;
        } else {
          clientIndexHtmlReact = data;
        }
        res.send(data);

        if (Config.testMode) {
          clientIndexHtmlBackbone = '';
          clientIndexHtmlReact = '';
        }
      }
    });
  } else {
    res.send(cachedHtml);
  }
});

router.post('/logError', (req: Request, res: Response) => {
  console.log('JSERROR : ' + req.body.errorMessage);
  res.send('1');
});

router.get('/auth/google', passport.authenticate('google', { 
  scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'] 
}));

router.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/' }));

if (Config.testMode) {
  router.use(errorHandler({
    log: true,
  }));

  passport.use(new LocalStrategy(
    (username, _password, done) => {
      const id = parseInt(username, 10);
      const user = {
        provider: 'google',
        id: id.toString(),
        emails: [{ value: 'test' + username + '@wavesurf.com' }],
        displayName: 'Surf Tester ' + id.toString(),
        photos: [{
          value: 'https://placekitten.com/100/100',
        }],
        _json: {},
      };

      return done(null, user as Express.User);
    }
  ));

  router.get('/loginTest', (req: Request, res: Response) => {
    const clientDir = shouldUseBackbone(req) ? clientDirs[0] : clientDirs[1];
    const testLoginPath = path.join(basePath, clientDir, 'test', 'login.html');
    res.sendFile(testLoginPath);
  });

  router.post('/loginTest', passport.authenticate('local', { 
    successRedirect: '/', 
    failureRedirect: '/loginTest' 
  }));

  router.get('/logoutTest', (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  });
}

router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

router.get('/invite/:inviteCode', async (req: Request<{ inviteCode: string }>, res: Response) => {
  const invite = await DAL.getWaveInviteByCode(req.params.inviteCode);
  if (invite) {
    (req.session as SurfSession).invite = invite;
  }
  res.redirect('/');
});

export default router;
