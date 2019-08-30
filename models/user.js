const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type : String,
    required: true
  },
  password: {
    type : String,
    required: true
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [{
      productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
      quantity: {type: Number, required: true},
    }]
  },
})

userSchema.methods.addToCart = function(product) {
  const cartItemIndex = this.cart.items.findIndex(cartItem => {
    return cartItem.productId.toString() === product._id.toString();
    // Même si on les utilise comme des strings, les _id renvoyés par mongoDB ne sont pas stricto sensu des string. Il faut donc les convertir si on veut une comparaison stricte.
  })
  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items];
  if (cartItemIndex >= 0){
    newQuantity = this.cart.items[cartItemIndex].quantity + 1;
    updatedCartItems[cartItemIndex].quantity = newQuantity;
  } else {
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity
    })
  }
  const updatedCart = {
    items: updatedCartItems
  }
  this.cart = updatedCart;
  return this.save();
}

userSchema.methods.deleteItemFromCart = function(prodId) {
  const updatedCartItems = this.cart.items.filter(item => {
    return item.productId.toString() !== prodId.toString();
  })
  this.cart.items = updatedCartItems;
  return this.save();
}

userSchema.methods.clearCart = function() {
  this.cart.items = [];
  return this.save();
}

module.exports = mongoose.model('User', userSchema);
