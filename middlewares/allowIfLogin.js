const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function allowIfLogin(req, res, next) {
  let token = req.headers["x-access-token"] || req.headers["authorization"];

  if (token === "Bearer null") {
    console.log("No Token found");
    return res.status(500).send("No Token found");
  }
  if (token === "Bearer undefined") {
    console.log("No Token found");
    return res.status(500).send("No Token found");
  }

  if (token.startsWith("Bearer ")) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
  }

  if (token) {
    const { userId, exp } = await jwt.verify(token, process.env.JWT_SECRET);

    // Check if token has expired
    if (exp < Date.now().valueOf() / 1000) {
      return res.status(401).json({
        error: "JWT token has expired, please login to obtain a new one",
      });
    }
    req.user = await User.findById(userId);

    next();
  } else {
    // next();
    return res.status(500).send("No Token found");
  }
}

module.exports = allowIfLogin;
