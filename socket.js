const { Server } = require('socket.io');
const wrap = require('./middlewares/wrapMiddleware');
const passport = require('passport');

//const chatSocket = require('./sockets/chatSocket');
//const adminDashboardSocket = require('./sockets/admin_dashboard_socket');

module.exports = (server, sessionMiddleware) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Wrap session + passport for all namespaces
  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));
  // Setup namespaces
  require('./sockets/chatSocket')(io); // Creates /chat namespace
  require('./sockets/admin_dashboard_socket')(io); // Creates /admin_dashboard namespace
  console.log("socket.io server active")
};


