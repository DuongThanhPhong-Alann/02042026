let multer = require('multer')
let path = require('path')

//luu o dau, luu ten la gi? file->req->save->xu ly
let storageSetting = multer.diskStorage({//path->filename
    destination: function (req, file, cb) {
        cb(null, "uploads/")
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname)
        let namefile = Date.now() + "-" + Math.round(Math.random() * 2E9) + ext;
        cb(null, namefile)
    },
})
let filterImage = function (req, file, cb) {
    if (file.mimetype.startsWith('image')) {
        cb(null, true)
    } else {
        cb(new Error("file sai dinh dang"))
    }
}
let filterExcel = function (req, file, cb) {
    if (file.mimetype.includes('spreadsheetml')) {
        cb(null, true)
    } else {
        cb(new Error("file sai dinh dang"))
    }
}
module.exports = {
    uploadImage: multer({
        storage: storageSetting,
        limits: 5 * 1024 * 1024,//5MB,
        fileFilter: filterImage
    }),
    uploadExcel: multer({
        storage: storageSetting,
        limits: 5 * 1024 * 1024,//5MB,
        fileFilter: filterExcel
    })
}