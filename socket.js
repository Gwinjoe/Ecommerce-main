const { Server } = require('socket.io');
const wrap = require('./middlewares/wrapMiddleware');
const passport = require('passport');

const chatSocket = require('./sockets/chatSocket');
const adminDashboardSocket = require('./sockets/admin_dashboard_socket');

module.exports = function(server, sessionMiddleware) {
  const io = new Server(server);

  // Wrap session + passport for all namespaces
  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));

  // Setup namespaces
  chatSocket(io); // Creates /chat namespace
  adminDashboardSocket(io); // Creates /admin_dashboard namespace
};

