const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

const config = require('../config');
const User = require('../models/user');

const SENDGRID_KEY = config.SENDGRID_KEY
const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: SENDGRID_KEY
  }
}));

exports.getLogin = (req,res,next) => {
  let message = req.flash('errorMessage');
  if (message) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    pageTitle: 'Login',
    path: "/login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    }
  });
};

exports.postLogin = (req,res,next) => {
  const email = req.body.email;
  const password = req.body.password;
  const renderLogicError = (email, password) => {
    return res.render('auth//login', {
      pageTitle: 'Log in',
      path: "/login",
      errorMessage: 'Invalid email or password',
      oldInput: {
        email: email
      }
    })
  };
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).render('auth//login', {
      pageTitle: 'Log in',
      path: "/login",
      errorMessage: validationErrors.array()[0].msg,
      oldInput: {
        email: email
      }
    });
  }
  User.findOne({email: email})
    .then(user => {
      if (!user) {
        return renderLogicError(email, password);
      }
      bcrypt.compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.user = user;
            req.session.isLoggedIn = true;
            return req.session.save(err => {
              if (err) {
                console.log(err);
              }
              res.redirect('/');
            })
          }
          renderLogicError(email, password);
        })
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.postLogout = (req,res,next) => {
  req.session.destroy(err => {
    res.redirect('/');
  })
};

exports.getSignup = (req,res,next) => {
  let message = req.flash('errorMessage');
  if (message) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    pageTitle: 'Signu up',
    path: "/signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: ""
    },
    validationErrors: []
  });
};

exports.postSignup = (req,res,next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      pageTitle: 'Signu up',
      path: "/signup",
      errorMessage: validationErrors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword
      },
      validationErrors: validationErrors.array()
    });
  }
  bcrypt.hash(password, 12)
  .then(hashedPassword => {
    const user = new User({
      email: email,
      password: hashedPassword,
      cart: {items: []}
    })
    return user.save();
  })
  .then(result => {
    res.redirect('/login');
    return transporter.sendMail({
      to: email,
      from: 'shop@shoptest.com',
      subject: 'test sign up',
      html: '<h1>Hello hello !</h1>' ,
    })
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    }
  );
};

exports.getReset = (req,res,next) => {
  let message = req.flash('errorMessage');
  if (message) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset-password', {
    pageTitle: 'Reset password',
    path: "/reset",
    errorMessage: message
  });
};

exports.postReset = (req,res,next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log('err');
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({email: req.body.email})
      .then(user => {
        if (!user) {
          req.flash('errorMessage', 'This user does not exists.')
          return res.redirect('/reset');
        }
        user.resetToken = token,
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save()
      })
      .then(results => {
        res.redirect('/login');
        transporter.sendMail({
          to: req.body.email,
          from: 'shop@shoptest.com',
          subject: 'Reset password',
          html: `
            <h1>Hello hello !</h1>
            <p>You asked for a new password.</p>
            <p>Click on this link to reset your password :</p><br>
            <a href='http://localhost:3000/reset/${token}'>Reset password</a>
            ` ,
        })
      })
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
        }
      );
  })
}

exports.getNewPwd = (req,res,next) => {
  const resetToken = req.params.resetToken;
  User.findOne({resetToken: resetToken, resetTokenExpiration: {$gte: Date.now()}})
    .then(user => {
      let message = req.flash('errorMessage');
      if (message) {
        message = message[0];
      } else {
        message = null;
      }
      res.render('auth/new-pwd', {
        pageTitle: 'Reset password',
        path: "/new-pwd",
        errorMessage: message,
        userId: user._id.toString(),
        resetToken: resetToken,
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
}

exports.postNewPwd = (req,res,next) => {
  const userId = req.body.userId;
  const newPwd = req.body.password;
  const resetToken = req.body.resetToken;
  let updatedUser;
  User.findOne({
    _id: userId,
    resetToken: resetToken,
    resetTokenExpiration: {$gte: Date.now()}
    })
    .then(user => {
      updatedUser = user;
      return bcrypt.hash(newPwd, 12);
    })
    .then(hashedPassword => {
      updatedUser.password = hashedPassword;
      updatedUser.resetToken = undefined;
      updatedUser.resetTokenExpiration = undefined;
      return updatedUser.save();
    })
    .then(results => {
      req.flash('errorMessage', 'Password updated');
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
}
