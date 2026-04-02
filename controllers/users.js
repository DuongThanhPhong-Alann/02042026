let userModel = require('../schemas/users')
module.exports = {
    CreateAnUser: async function (
        username, password, email, role, session,
        fullname, avatarUrl, status, loginCount) {
        let newUser = new userModel({
            username: username,
            password: password,
            email: email,
            fullName: fullname,
            avatarUrl: avatarUrl,
            status: status,
            role: role,
            loginCount: loginCount
        });
        await newUser.save({ session });
        return newUser;
    },
    FindUserByUsername: async function (username) {
        return await userModel.findOne({
            username: username,
            isDeleted: false
        })
    },
    FindUserByEmail: async function (email) {
        return await userModel.findOne({
            email: email,
            isDeleted: false
        })
    }, FindUserByToken: async function (token) {
        return await userModel.findOne({
            forgotPasswordToken: token,
            isDeleted: false
        })
    },
    FindUserById: async function (id) {
        try {
            return await userModel.findOne({
                _id: id,
                isDeleted: false
            }).populate('role')
        } catch (error) {
            return false
        }
    }
}