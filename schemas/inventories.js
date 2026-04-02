let mongoose = require('mongoose')
let inventorySchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product',
        required: true,
        unique: true
    },
    stock: {
        type: Number,
        min: 0,
        default: 0
    },
    reserved: {
        type: Number,
        min: 0,
        default: 0
    },
    soldCount: {
        type: Number,
        min: 0,
        default: 0
    }
})
module.exports = mongoose.model('inventory', inventorySchema)