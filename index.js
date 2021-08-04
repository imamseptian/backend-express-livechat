const express = require("express");
const auther = require("./routes/auth");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("./model/User");
const bcrypt = require("bcryptjs");
const Message = require("./model/Message");
const { check, body, validationResult } = require("express-validator");

// const app = express();
// const http = require("http");
// const server = http.createServer(app);
// const { Server } = require("socket.io");
let connected_users = [];
const PORT = process.env.PORT || 4000;
const PORT_SOCKET = process.env.PORT || 8000;
const app = express();
// const http = require("http").Server(app);
// const io = require("socket.io")(PORT_SOCKET, {
//   cors: {
//     origin: "http://localhost:3000",
//   },
// });

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000",
//   },
// });

const InitiateMongoServer = require("./config/mongo");

InitiateMongoServer();

const allowedOrigins = ["http://localhost:3000"];
const options = (cors.CorsOptions = {
  origin: allowedOrigins,
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(options));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      path.parse(file.originalname).name +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * Math.pow(1024, 2 /* MBs*/) },
});

app.get("/", (req, res) => {
  res.json({ message: "API Working" });
});

app.use("/user", auther);
app.post(
  `/api/upload`,
  upload.single("gambar"),
  check("email", "Email field is invalid, etc etc").isEmail(),

  async (req, res) => {
    // console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // console.log(errors);
      const mypath = "./public/uploads/" + req.file.filename;
      if (fs.existsSync(mypath)) {
        // mypath exists
        console.log("exists:", mypath);
        // fs.unlinkSync(mypath);
      } else {
        console.log("DOES NOT exist:", mypath);
      }
      return res.status(400).json({
        errors: errors.array(),
      });
    }
    // let finalImageURL =
    //   req.protocol + "://" + req.get("host") + "/uploads/" + req.file.filename;

    let user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      // avatar: req.file.filename,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    await user.save();
    res.status(200).json({
      message: "success create user",
      // image: finalImageURL,
    });

    // res.json({ image: finalImageURL });
  }
);

// io.on("connection", async (socket) => {
//   console.log("user connected id :" + socket.id);
//   let userData = socket.handshake.query;
//   connected_users.push({ socketID: socket.id, userID: userData.userId });
//   console.log(`connected users : ${connected_users.length}`);
//   const doc = await User.findOne({ _id: userData.userId });
//   const update_data = { isOnline: true, lastOnline: Date.now() };
//   await doc.updateOne(update_data);
//   await doc.save();

//   socket.on("sendMessage", async (msg) => {
//     // console.log(msg);
//     let myMessage = new Message({
//       sender: msg.sender,
//       receiver: msg.receiver,
//       content: msg.content,
//       createdAt: msg.createdAt,
//     });

//     await myMessage.save();
//     console.log("message saved");
//     // console.log(`${userData.userId} / ${msg.receiver}`);

//     let selected_socket = [];
//     connected_users.forEach((item) => {
//       if (item.userID === msg.receiver) {
//         selected_socket.push(item.socketID);
//       }
//     });
//     console.log(selected_socket);
//     if (selected_socket.length > 0) {
//       io.to(selected_socket).emit("clientMessage", {
//         sender: msg.sender,
//         receiver: msg.receiver,
//         content: msg.content,
//         createdAt: msg.createdAt,
//       });
//     }

//     console.log(connected_users.length);
//     console.log(selected_socket);
//   });

//   socket.on("disconnect", async () => {
//     console.log("user disconnected");
//     connected_users = connected_users.filter((item) => {
//       return item.socketID !== socket.id;
//     });
//     const doc = await User.findOne({ _id: userData.userId });
//     const update_data = { isOnline: false, lastOnline: Date.now() };
//     await doc.updateOne(update_data);
//     await doc.save();

//     console.log(`connected users : ${connected_users.length}`);
//   });
// });

app.listen(PORT, (req, res) => {
  console.log(`Server Started at PORT ${PORT}`);
});
