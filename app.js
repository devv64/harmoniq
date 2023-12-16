import express from 'express';
const app = express();
import configRoutes from './routes/index.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import exphbs from 'express-handlebars';
import session from 'express-session';
const __filename = fileURLToPath(import.meta.url);
const __dirname =   dirname(__filename);

const staticDir = express.static(__dirname + '/public');

const rewriteUnsupportedBrowserMethods = (req, res, next) => {
    if (req.body && req.body._method) {
        req.method = req.body._method;
        delete req.body._method;
    }

    next();
}

app.use('/public', staticDir);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rewriteUnsupportedBrowserMethods);

app.engine('handlebars', exphbs.engine({ 
  defaultLayout: 'main',
  helpers: {
    eq: function (a, b) { return a === b; },
  }
 }));
app.set('view engine', 'handlebars');

//cookie for getting current user
app.use( 
  session({
    name: 'AuthCookie',
    secret: 'some secret string!',
    saveUninitialized: false,
    resave: false
  })
);


app.use('/', (req, res, next) => {
  console.log(`[${new Date().toUTCString()}]: ${req.method} ${req.originalUrl} (${req.session.user ? 'Authenticated' : 'Non-Authenticated User'})]`)

  if (req.path === '/') {
    if (req.session.user) {
      return res.redirect('/feed');
    } else {
      return res.redirect('/home')
    }   
  } else {
    next();
  }
})

// ? Should user be able to access profile page without being logged in
app.use('/feed', (req, res, next) => {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
});

app.use('/posts', (req, res, next) => {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
});

app.use('/profile', (req, res, next) => {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    return res.render('profilePage', { 
      profilePic: req.session.user.pfp,
      username: req.session.user.username,
      posts: req.session.user.createdPosts,
      followers: req.session.user.followers,
      following: req.session.user.following,
      likedPosts: req.session.user.likedPosts,
      notifications: req.session.user.notifications,
      isPersonalAccount: true
    });
  }
});

app.use('/users', (req, res, next) => {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
});

configRoutes(app);

app.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});
