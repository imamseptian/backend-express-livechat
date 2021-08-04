const jwt = require("jsonwebtoken");

module.exports = function(req, res, next) {
  const token = req.header("token");
  if (!token) return res.status(401).json({ message: "Auth Error" });

  jwt.verify(token, "randomString", (err, authData) => {
    if (err) {
        console.error(err);
        res.status(500).send({ message: "Invalid Token" });
    } else {
         
    req.user = authData;
    next();
     
    }
  });

//   try {
   
//     const decoded = jwt.verify(token, "randomString");
//     req.user = decoded.user;
//     next();
//   } catch (e) {
//     console.error(e);
//     res.status(500).send({ message: "Invalid Token" });
//   }
};
