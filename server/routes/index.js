const authRoutes = require("./auth");
const roomRoutes = require("./rooms");
const fileRoutes = require("./files");
const chatRoutes = require("./chats");
const folderRoutes = require("./folders");
const userRoutes = require("./users");
const executeRoutes = require("./execute");
const activityRoutes = require("./activities");

module.exports = {
  authRoutes,
  roomRoutes,
  fileRoutes,
  chatRoutes,
  folderRoutes,
  userRoutes,
  executeRoutes,
  activityRoutes
};
