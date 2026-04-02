var express = require('express');
var router = express.Router();
const { checkLogin, checkRole } = require("../utils/authHandler");
let cartModel = require('../schemas/carts')
let inventoryModel = require('../schemas/inventories')

router.get('/', checkLogin, async function (req, res, next) {
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    })
    res.send(cart)
})
router.post('/add', checkLogin, async function (req, res, next) {
    let { product, quantity } = req.body;
    let productItem = await inventoryModel.findOne({
        product: product
    })
    if (!productItem) {
        res.status(404).send({
            message: "product khong ton tai"
        })
        return;
    }
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    })
    let cartItems = cart.products;
    let index = cartItems.findIndex(
        function (e) {
            return e.product == product
        }
    )
    if (index > -1) {
        if (productItem.stock >= (quantity + cartItems[index].quantity)) {
            cartItems[index].quantity += quantity;
            await cart.save();
        } else {
            res.status(404).send({
                message: "product khong du so du"
            })
            return;
        }
    } else {
        console.log(productItem);
        if (productItem.stock >= quantity) {
            cartItems.push({
                product: product,
                quantity: quantity
            })
            await cart.save();
        } else {
            res.status(404).send({
                message: "product khong du so du"
            })
            return;
        }

    }
    res.send(cart)
})
router.post('/remove', checkLogin, async function (req, res, next) {
    let { product, quantity } = req.body;
    let productItem = await inventoryModel.findOne({
        product: product
    })
    if (!productItem) {
        res.status(404).send({
            message: "product khong ton tai"
        })
        return;
    }
    let user = req.user;
    let cart = await cartModel.findOne({
        user: user._id
    })
    let cartItems = cart.products;
    let index = cartItems.findIndex(
        function (e) {
            return e.product == product
        }
    )
    if (index > -1) {
        if (cartItems[index].quantity > quantity) {
            cartItems[index].quantity -= quantity;
        } else {
            if (cartItems[index].quantity == quantity) {
                cartItems.splice(index, 1)
            } else {
                res.status(404).send({
                    message: "so luong remove khong du"
                })
                return;
            }
        }
        await cart.save()
    } else {
        res.status(404).send({
            message: "gio hang khong ton tai vat pham nay"
        })
        return;

    }
    res.send(cart)
})
module.exports = router;