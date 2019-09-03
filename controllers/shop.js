const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

exports.getIndex = (req,res,next) => {
  Product.find()
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.getProducts = (req,res,next) => {
  Product.find()
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.getProduct = (req,res,next) => {
  const prodId = req.params.productID;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/product'
      })})
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.getCart = (req,res,next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()         // Transforme la réponse de populate() en promesse.
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        pageTitle: 'Cart',
        path: '/cart',
        products: products
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.postCart = (req,res,next) => {
  const prodId = req.body.productID;
  Product
    .findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect('/cart')
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.postCartDeleteProduct = (req,res,next) => {
  const prodId = req.body.productID;
  req.user
    .deleteItemFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
};

exports.getOrders = (req,res,next) => {
  Order.find({"user.userId": req.user._id})
    .then(orders => {
      res.render('shop/orders', {
        pageTitle: 'My orders',
        path: '/orders',
        orders: orders
      })
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
}

exports.postOrder = (req,res,next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()         // Transforme la réponse de populate() en promesse.
    .then(user => {
      const products = user.cart.items.map(item => {
        return {product: {...item.productId._doc}, quantity: item.quantity}
      });
      const order = new Order({
        user: {
          userId: req.user,     // Pas besoin de préciser "_id" dans req.user._id. L'ID
          email: req.user.email // est retrouvé automatiqment par Mongoose dans la
        },                //  requête si la relation est définie dans le modèle Product.
        products: products,
      })
      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
      }
    );
}

exports.getInvoice = (req,res,next) => {
    const orderId = req.params.orderId;
    const invoiceName = `invoice-${orderId}.pdf`;
    const invoicePath = path.join('data', 'invoices', invoiceName);
    console.log(orderId);
    Order.findById(orderId)
      .then(order => {
          if (!orderId) {
          console.log('orderId');
          return next(err);
        }
        if (order.user.userId.toString() !== req.user._id.toString()) {
          console.log('user');
          return next(err);
        }
        const pdfDocument = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);
        pdfDocument.pipe(fs.createWriteStream(invoicePath));
        pdfDocument.pipe(res);

        pdfDocument.fontSize(26).text('Invoice');
        pdfDocument.fontSize(22).text(`Order n°: ${orderId}`);
        pdfDocument.fontSize(26).text('----------------------------------------------');
        let totalPrice = 0;
        order.products.forEach(item => {
          totalPrice += item.quantity * item.product.price;
          pdfDocument.fontSize(16).text(`
            ${item.product.title} - Qty: ${item.quantity} - Price: $ ${item.product.price}
            `);
        });
        pdfDocument.fontSize(26).text('----------------------------------------------');
        pdfDocument.fontSize(20).text(`
          Total price : $ ${totalPrice}.
          `);

        pdfDocument.end();
        })
      .catch(err => next(err));
}
