let express = require('express')
let router = express.Router()
let userController = require('../controllers/users')
let { RegisterValidator, validatedResult, ChangePasswordValidator } = require('../utils/validator')
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')
const { checkLogin } = require('../utils/authHandler')
let crypto = require('crypto')
let { sendMail } = require('../utils/mailHandler')
let mongoose = require('mongoose')
let cartModel = require('../schemas/carts')

router.post('/register', RegisterValidator, validatedResult, async function (req, res, next) {
    let session = await mongoose.startSession();
    session.startTransaction()
    try {
        let { username, password, email } = req.body;
        let newUser = await userController.CreateAnUser(
            username, password, email, '69b2763ce64fe93ca6985b56'
        )
        let newCart = new cartModel({
            user: newUser._id
        })
        await newCart.save({ session });
        await newCart.populate('user');
        await session.commitTransaction()
        session.endSession()
        res.send(newCart)
    } catch (error) {
        await session.abortTransaction()
        session.endSession()
        res.status(404).send(error.message)
    }
})
router.post('/login', async function (req, res, next) {
    let { username, password } = req.body;
    let user = await userController.FindUserByUsername(username);
    if (!user) {
        res.status(404).send({
            message: "thong tin dang nhap khong dung"
        })
        return;
    }
    if (!user.lockTime || user.lockTime < Date.now()) {
        if (bcrypt.compareSync(password, user.password)) {
            user.loginCount = 0;
            await user.save();
            let token = jwt.sign({
                id: user._id,
            }, 'secret', {
                expiresIn: '1h'
            })
            res.cookie("TOKEN_LOGIN", token, {
                maxAge: 24 * 3600 * 1000,
                httpOnly: true,
                secure: false
            })
            res.send(token)
        } else {
            user.loginCount++;
            if (user.loginCount == 3) {
                user.loginCount = 0;
                user.lockTime = new Date(Date.now() + 60 * 60 * 1000)
            }
            await user.save();
            res.status(404).send({
                message: "thong tin dang nhap khong dung"
            })
        }
    } else {
        res.status(404).send({
            message: "user dang bi ban"
        })
    }

})

router.post("/logout", checkLogin, function (req, res, next) {
    res.cookie("TOKEN_LOGIN", null, {
        maxAge: 0,
        httpOnly: true,
        secure: false
    })
    res.send("logout thanh cong")
})

router.post('/changepassword', checkLogin, ChangePasswordValidator, async function (req, res, next) {
    let { oldpassword, newpassword } = req.body;
    if (bcrypt.compareSync(oldpassword, req.user.password)) {
        req.user.password = newpassword;
        await req.user.save();
        res.send("doi pass thanh cong")
    } else {
        res.status(404).send("old password khong dung")
    }

})

router.get('/me', checkLogin, function (req, res, next) {
    res.send(req.user)
})
router.post('/forgotpassword', async function (req, res, next) {
    let email = req.body.email;
    let user = await userController.FindUserByEmail(email);
    if (user) {
        user.forgotPasswordToken = crypto.randomBytes(32).toString('hex');
        user.forgotPasswordTokenExp = Date.now() + 10 * 60 * 1000;
        await user.save();
        let url = "http://localhost:3000/api/v1/auth/resetpassword/" + user.forgotPasswordToken
        sendMail(user.email, url);
    }
    res.send("check mail de cap nhat passs");
})
router.post('/resetpassword/:token', async function (req, res, next) {
    let token = req.params.token;
    let user = await userController.FindUserByToken(token);
    if (!user) {
        res.status(404).send("token loi")
        return;
    }
    if (user.forgotPasswordTokenExp > Date.now()) {
        user.password = req.body.password;
        user.forgotPasswordToken = null;
        user.forgotPasswordTokenExp = null;
        await user.save()
        res.send("cap nhat thanh cong")
    } else {
        res.status(404).send("ma het han")
    }
})

module.exports = router;