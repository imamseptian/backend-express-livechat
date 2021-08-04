const express = require("express");
const { check, body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const User = require("../model/User");
const Message = require("../model/Message");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      // path.parse(file.originalname).name +
      //   "-" +
      Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

router.post(
  "/signup",
  upload.single("avatar"),
  [
    body("username")
      .isLength({ min: 6 })
      .withMessage("Username must be 6 characters or more")
      .custom(async (value) => {
        let checkUser = await User.findOne({
          username: value,
        });
        if (checkUser) {
          return Promise.reject("Username already in use");
        }
        return true;
      })
      .custom((value) => !/\s/.test(value))
      .withMessage("No spaces are allowed in the username"),
    body("email")
      .isEmail()
      .withMessage("Email format not valid")
      .custom(async (value) => {
        let checkUser = await User.findOne({
          email: value,
        });
        if (checkUser) {
          return Promise.reject("E-mail already in use");
        }
        return true;
      }),
    body("password")
      .isLength({ min: 8 })
      .withMessage("The password must be 8 character or more"),
    body("password_confirmation").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }

      // Indicates the success of this synchronous custom validator
      return true;
    }),
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // console.log(errors);
      if (req.file) {
        const mypath = "./public/uploads/" + req.file.filename;
        console.log(mypath);
        if (fs.existsSync(mypath)) {
          // mypath exists
          console.log("exists:", mypath);
          fs.unlinkSync(mypath);
        } else {
          console.log("DOES NOT exist:", mypath);
        }
      }
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { username, email, password } = req.body;
    try {
      // let user = await User.findOne({
      //   email,
      // });
      // if (user) {
      //   return res.status(400).json({
      //     msg: "User Already Exists",
      //   });
      // }
      if (req.file) {
        let user = new User({
          username,
          email,
          password,
          avatar: req.file.filename,
        });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(200).json({
          message: "success create user",
        });
      } else {
        let user = new User({
          username,
          email,
          password,
        });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(200).json({
          message: "success create user",
        });
      }
    } catch (err) {
      console.log(err.message);
      res.status(500).send("Error in Saving");
    }
  }
);

router.post(
  "/login",
  [
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Please enter a valid password").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({
        email,
      });
      if (!user)
        return res.status(400).json({
          message: "User Not Exist",
        });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({
          message: "Incorrect Password !",
        });

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        "randomString",
        {
          expiresIn: 3600,
        },
        (err, token) => {
          if (err) throw err;
          res.status(200).json({
            token: token,
            user: user,
          });
        }
      );
    } catch (e) {
      console.error(e);
      res.status(500).json({
        message: "Server Error",
      });
    }
  }
);

router.get("/me", auth, async (req, res) => {
  try {
    // request.user is getting fetched from Middleware after token authentication
    //   const user = await User.findById(req.user.id);
    const user = req.user;
    const filtered = await User.find({ _id: { $ne: user.user.id } });
    console.log(req.user);
    res.json({ user: user, test: req.user, filtered: filtered });
  } catch (e) {
    res.send({ message: "Error in Fetching user" });
  }
});

router.get("/getchat", auth, async (req, res) => {
  try {
    // request.user is getting fetched from Middleware after token authentication
    // const user = await User.findById(req.user.id);
    // console.log(req.user);
    const friendId = req.query.friendid;
    // console.log(friendId);
    const filtered = await User.findOne({ _id: friendId.toString() });
    // console.log(`sender : ${req.user.user.id}`);
    // console.log(`receiver : ${friendId}`);
    // const chatlog = await Message.find({
    //   sender: req.user.user.id,
    //   receiver: friendId,
    // });

    // const chatlog = await Message.find({
    //   $or: [
    //     { sender: req.user.user.id },
    //     { sender: friendId },
    //     { receiver: friendId },
    //     { receiver: req.user.user.id },
    //   ],
    // });

    const chatlog = await Message.find({
      $or: [
        { $and: [{ sender: req.user.user.id }, { receiver: friendId }] },
        { $and: [{ sender: friendId }, { receiver: req.user.user.id }] },
      ],
    });

    // console.log(filtered);
    // console.log(req.user);
    res.json({ friendAcc: filtered, chatLog: chatlog });
  } catch (e) {
    res.send({ message: "Error in Fetching user" });
  }
});

router.get("/homepage", auth, async (req, res) => {
  try {
    const currentUser = await User.findOne({
      _id: req.user.user.id,
    });
    const filtered = await User.find({
      _id: { $ne: req.user.user.id },
      // ,
      // username: "imamseptian",
    });

    const recentChat = await Message.find({
      $or: [
        { sender: req.user.user.id.toString() },
        { receiver: req.user.user.id.toString() },
      ],
      // ,
      // username: "imamseptian",
    });
    let recentIds = [];
    recentChat.forEach((item) => {
      if (!recentIds.includes(item.sender)) {
        recentIds.push(item.sender);
      }
      if (!recentIds.includes(item.receiver)) {
        recentIds.push(item.receiver);
      }
    });

    // let uniqueSender = [...new Set(recentChat.map((item) => item.sender))];
    // let uniqueReceiver = [...new Set(recentChat.map((item) => item.receiver))];
    // let recentIds = uniqueSender.concat(uniqueReceiver);
    // let uniqIds = [...new Set(recentIds)];
    console.log(recentIds);
    const recentUsers = await User.find({
      _id: {
        $ne: req.user.user.id,
        $in: recentIds,
      },
    });
    console.log(recentUsers.length);

    res.json({
      // users: filtered,
      users: recentUsers,
      currentuser: currentUser,
    });
  } catch (e) {
    res.send({ message: "Error in Fetching user" });
  }
});

router.get("/find", auth, async (req, res) => {
  try {
    const currentUser = await User.findOne({
      _id: req.user.user.id,
    });

    console.log(req.query.keyword);

    const listUsers = await User.find({
      username: { $regex: req.query.keyword },
      _id: { $ne: req.user.user.id },
    });

    res.json({
      // users: filtered,
      users: listUsers,
      currentuser: currentUser,
    });
  } catch (e) {
    res.send({ message: "Error in Fetching user" });
  }
});

module.exports = router;
