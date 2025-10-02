const authRoutes = require("./auth");
const roomRoutes = require("./rooms");
const fileRoutes = require("./files");
const chatRoutes = require("./chats");
const userRoutes = require("./users");
const executeRoutes = require("./execute");

module.exports = {
  authRoutes,
  roomRoutes,
  fileRoutes,
  chatRoutes,
  userRoutes,
  executeRoutes
};
