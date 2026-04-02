let mongoose = require('mongoose')
let itemReservationSchema = mongoose.Schema({
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product'
    },
    title: {
        type: String,
        required: "true"
    },
    quantity: {
        type: Number,
        min: 1
    },
    price: {
        type: Number,
        min: 0
    },
    subtotal: {
        type: Number,
        min: 0
    },
}, {
    _id: false
})
let reservationSchema = mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: {
        type: [itemReservationSchema],
        default: []
    },
    status: {
        type: String,
        enum: ["Actived", "Expired", "Cancelled", "Transfered"],
        default: "Actived"
    },
    ExpiredIn: {
        type: Date
    },
    Amount: {
        type: Number,
        default: 0
    }
})
module.exports = new mongoose.model('revervation', reservationSchema);