const express = require('express');
const { check, body } = require('express-validator');

const router = express.Router();
const authController = require('../controllers/auth');

const User = require('../models/user');

router.get('/login', authController.getLogin);

router.post('/login',
  [
  check('email')
    .isEmail()
    .withMessage('Please, verify your email.')
    .normalizeEmail(),
  body('password', 'Invalid email or password')
    .isLength({ min: 5 })
    .isAlphanumeric()
    .trim()
  ],
  authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignup);

router.post('/signup',
  [
  check('email')
    .isEmail()
    .withMessage('Please, verify your email.')
    .custom((value, {req}) => {
      return User.findOne({email: value})
      .then(existingUser => {
        if (existingUser) {
          return Promise.reject('This email is already used');
        }
      })
    })
    .normalizeEmail(),
  body('password', 'Password must have at least 5 characters and only numbers and letters')
    .isLength({ min: 5 })
    .isAlphanumeric()
    .trim(),
  body('confirmPassword')
    .custom((value, {req}) => {
    if (value !== req.body.password) {
        throw new Error("Passwords don't match");
      }
      return true;
    })
    .trim()
  ],
  authController.postSignup);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:resetToken', authController.getNewPwd);

router.post('/new-pwd', authController.postNewPwd);

module.exports = router;
