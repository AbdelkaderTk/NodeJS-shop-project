const express = require('express');
const { body } = require('express-validator');

const router = express.Router();
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

router.get('/products', isAuth, adminController.getProducts);

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post('/add-product', isAuth,
  [
  body('title')
    .isString()
    .isLength({min: 2})
    .trim(),
  body('price')
    .isCurrency(),
  body('description')
    .isLength({min: 6})
    .trim(),
  ],
  adminController.postAddProduct);

router.get('/edit-product/:productID', isAuth, adminController.getEditProduct);

router.post('/edit-product/',
  [
  body('title')
    .isString()
    .isLength({min: 2})
    .trim(),
  body('price')
    .isCurrency(),
  body('description')
    .isLength({min: 6})
    .trim(),
  ],
  isAuth, adminController.postEditProduct);

router.delete('/product/:productID', isAuth, adminController.deleteProduct);

module.exports = router;
