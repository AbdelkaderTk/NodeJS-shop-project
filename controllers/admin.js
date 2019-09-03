const { validationResult } = require('express-validator');

const Product = require('../models/product');

const fileHelper = require('../util/file');

exports.getAddProduct = (req,res,next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add product',
    path: '/admin/add-product',
    editing: false,
    product: {title: null, price: null, description: null},
    validationErrors: [],
    errorMessage: null
  });
};

exports.postAddProduct = (req,res,next) => {
  const title = req.body.title;
  const image = req.file;
  const description = req.body.description;
  const price = req.body.price;
  const validationErrors = validationResult(req);

  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add product',
      path: '/admin/add-product',
      editing: false,
      product: {title: title, description: description, price: price},
      validationErrors: [],
      errorMessage: 'This file is not an image.',
    });
  }
  const imageURL = image.path;

  const product = new Product({
    title: title,
    imageURL: imageURL,
    description: description,
    price: price,
    userId: req.user    // Pas besoin de préciser "_id" dans req.user._id. L'ID est
  });             // retrouvé automatiqment par Mongoose dans la requête si la
                  // relation est définie dans le modèle Product.
  if (!validationErrors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add product',
      path: '/admin/add-product',
      editing: false,
      product: product,
      validationErrors: validationErrors.array(),
      errorMessage: validationErrors.array()[0].msg,
    });
  };
  product
    .save()
    .then(() => {
      console.log('Created product');
      res.redirect("/admin/products");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.getEditProduct = (req,res,next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodID = req.params.productID;
  Product.findById(prodID)
    .then(product => {
      if (!product) {
        return res.redirect("/");
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        validationErrors: [],
        errorMessage: null
      })
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.postEditProduct = (req,res,next) => {
  const prodID = req.body.productID;
  const updatedTitle = req.body.title;
  const updatedDescription = req.body.description;
  const updatedPrice = req.body.price;
  const userId = req.user._id;
  const image = req.file;

  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    const productWithError = {
      _id: prodID,
      title: updatedTitle,
      description: updatedDescription,
      price: updatedPrice,
      userId: userId
    };
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit product',
      path: '/admin/edit-product',
      editing: true,
      product: productWithError,
      validationErrors: validationErrors.array(),
      errorMessage: validationErrors.array()[0].msg,
    });
  };
  Product.findById(prodID).then(product => {
    if (product.userId.toString() !== userId.toString()) {
      return res.redirect('/');
    }
    product.title = updatedTitle;
    if (image) {
      fileHelper.deleteFile(product.imageURL);
      product.imageURL = image.path;
    }
    product.description = updatedDescription;
    product.price = updatedPrice;
    return product.save().then(results => {
      console.log('UPDATED PRODUCT');
      res.redirect("/admin/products");
    })
  })
  .catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    }
  );
};

exports.getProducts = (req,res,next) => {
  Product
    .find({ userId: req.user._id })
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin products',
        path: '/admin/products'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.postDeleteProduct = (req,res,next) => {
  const prodID = req.body.productID;
  const userId = req.user._id;
  Product.findById(prodID)
    .then(product => {
      if (!product) {
        throw new Error('Product not found');
      }
      fileHelper.deleteFile(product.imageURL);
      return Product.deleteOne({_id: prodID, userId: userId});
    })
    .then(results => {
      console.log(results);
      if (results.n > 0) {
        req.user.deleteItemFromCart(prodID)
        console.log('PRODUCT DELETED');
      }
      res.redirect("/admin/products");
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
}
