const jwt = require("jsonwebtoken");

const getAccessToken = (userId) =>
  jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

module.exports = getAccessToken;
