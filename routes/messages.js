var express = require("express");
var router = express.Router();
let mongoose = require("mongoose");
let multer = require("multer");
let path = require("path");

let messageModel = require("../schemas/messages");
let userModel = require("../schemas/users");
const { checkLogin } = require("../utils/authHandler");

let storageSetting = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    let namefile = Date.now() + "-" + Math.round(Math.random() * 2e9) + ext;
    cb(null, namefile);
  },
});

let uploadAnyFile = multer({
  storage: storageSetting,
  limits: 20 * 1024 * 1024, // 20MB
});

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function pickMessageText(req) {
  if (req.body && req.body.messageContent && typeof req.body.messageContent.text === "string") {
    return req.body.messageContent.text;
  }
  if (req.body && typeof req.body.text === "string") return req.body.text;
  return "";
}

function pickMessageType(req) {
  if (req.body && req.body.messageContent && typeof req.body.messageContent.type === "string") {
    return req.body.messageContent.type;
  }
  if (req.body && typeof req.body.type === "string") return req.body.type;
  return "text";
}

// GET "/" - lấy message cuối cùng của mỗi user đang chat với user hiện tại
router.get("/", checkLogin, async function (req, res, next) {
  try {
    let me = req.user._id;
    let results = await messageModel.aggregate([
      {
        $match: {
          $or: [{ from: me }, { to: me }],
        },
      },
      {
        $addFields: {
          otherUser: {
            $cond: [{ $eq: ["$from", me] }, "$to", "$from"],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$otherUser",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "otherUser",
        },
      },
      { $unwind: { path: "$otherUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.from",
          foreignField: "_id",
          as: "fromUser",
        },
      },
      { $unwind: { path: "$fromUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.to",
          foreignField: "_id",
          as: "toUser",
        },
      },
      { $unwind: { path: "$toUser", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          otherUser: {
            _id: 1,
            username: 1,
            fullName: 1,
            avatarUrl: 1,
          },
          lastMessage: 1,
          fromUser: {
            _id: 1,
            username: 1,
            fullName: 1,
            avatarUrl: 1,
          },
          toUser: {
            _id: 1,
            username: 1,
            fullName: 1,
            avatarUrl: 1,
          },
        },
      },
    ]);
    res.send(results);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// GET "/:userID" - lấy toàn bộ message giữa user hiện tại và userID (2 chiều)
router.get("/:userID", checkLogin, async function (req, res, next) {
  try {
    let otherId = req.params.userID;
    if (!isValidObjectId(otherId)) return res.status(400).send({ message: "userID invalid" });

    let me = req.user._id;
    let other = new mongoose.Types.ObjectId(otherId);

    let messages = await messageModel
      .find({
        $or: [
          { from: me, to: other },
          { from: other, to: me },
        ],
      })
      .sort({ createdAt: 1 })
      .populate("from", "username fullName avatarUrl")
      .populate("to", "username fullName avatarUrl");

    res.send(messages);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST "/:userID/seed" - tạo nhanh ~10 tin nhắn mẫu giữa user hiện tại và userID
router.post("/:userID/seed", checkLogin, async function (req, res, next) {
  try {
    let otherId = req.params.userID;
    if (!isValidObjectId(otherId)) return res.status(400).send({ message: "userID invalid" });

    let count = Number.parseInt(req.body && req.body.count, 10);
    if (Number.isNaN(count) || count <= 0) count = 10;
    if (count > 100) count = 100;

    let toUser = await userModel.findOne({ _id: otherId, isDeleted: false });
    if (!toUser) return res.status(404).send({ message: "user not found" });

    let me = req.user._id;
    let other = toUser._id;

    let docs = [];
    for (let i = 1; i <= count; i++) {
      let from = i % 2 === 1 ? me : other;
      let to = i % 2 === 1 ? other : me;
      docs.push({
        from,
        to,
        messageContent: {
          type: "text",
          text: `seed message ${i}`,
        },
      });
    }

    await messageModel.insertMany(docs);
    let messages = await messageModel
      .find({
        $or: [
          { from: me, to: other },
          { from: other, to: me },
        ],
      })
      .sort({ createdAt: 1 })
      .populate("from", "username fullName avatarUrl")
      .populate("to", "username fullName avatarUrl");

    res.send(messages);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// POST "/:userID" - gửi message đến userID (text hoặc file)
router.post(
  "/:userID",
  checkLogin,
  uploadAnyFile.single("file"),
  async function (req, res, next) {
    try {
      let otherId = req.params.userID;
      if (!isValidObjectId(otherId)) return res.status(400).send({ message: "userID invalid" });

      let toUser = await userModel.findOne({ _id: otherId, isDeleted: false });
      if (!toUser) return res.status(404).send({ message: "user not found" });

      let contentType = pickMessageType(req);
      let contentText = pickMessageText(req);

      if (req.file) {
        contentType = "file";
        contentText = req.file.path;
      }

      if (contentType !== "file" && contentType !== "text") {
        return res.status(400).send({ message: "messageContent.type must be file|text" });
      }
      if (!contentText || typeof contentText !== "string") {
        return res.status(400).send({ message: "messageContent.text is required" });
      }

      let newMessage = new messageModel({
        from: req.user._id,
        to: toUser._id,
        messageContent: {
          type: contentType,
          text: contentText,
        },
      });
      await newMessage.save();
      await newMessage.populate("from", "username fullName avatarUrl");
      await newMessage.populate("to", "username fullName avatarUrl");

      res.send(newMessage);
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  }
);

module.exports = router;
