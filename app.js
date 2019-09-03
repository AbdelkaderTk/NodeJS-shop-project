const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const config = require('./config');
const User = require('./models/user');

const app = express();
app.set('view engine', 'ejs');

const MONGODB_URI = config.MONGODB_URI;
const store = new MongoDBStore({
  uri : MONGODB_URI,
  collections: 'sessions'
})
const csrfProtection = csrf();

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
})

const fileFilter = (req,file, cb) => {
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg'  ||
    file.mimetype === 'image/png'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

app.use(bodyParser.urlencoded({extended:false}));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter}).single('image')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({
  secret: 'SecretKey',
  resave: false,
  saveUninitialized: false,
  store: store
  })
);
app.use(csrfProtection);
app.use(flash());

app.use((req,res,next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
})

// Pour chaque requête, ce middleware vérifie l'existence d'un user dans la BD et le stocke dans l'objet requête d'Express. Ceci permet, en plus d'avoir les données de l'utilisateur de la BD, d'ajouter les méthodes spécifiques à Mongoose dans les requêtes de cet utilisateur.
app.use((req,res,next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
  .then(user => {
    if (!user) {
      return next();
    }
    req.user = user;
    next();
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    }
  );
})

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use('/500', errorController.get500);
app.use(errorController.get404);

app.use((error,req,res,next) => {
  console.log(error);
  res.status(500).render('500', {
    pageTitle: 'Technical error',
    path: "/500"
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(3000);
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    }
  );
