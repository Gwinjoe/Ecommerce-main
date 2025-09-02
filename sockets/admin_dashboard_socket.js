const Orders = require('../models/orderSchema');
const Users = require('../models/userModel');
const Products = require('../models/productSchema');
const Categories = require('../models/categorySchema');

module.exports = function(io) {
  const adminNamespace = io.of('/admin_dashboard');

  adminNamespace.use((socket, next) => {
    if (socket.request.user && socket.request.user.admin) {
      return next();
    }
    next(new Error('Unauthorized'));
  });

  adminNamespace.on('connection', async (socket) => {
    const user = socket.request.user;
    console.log(`[Admin Dashboard] ${user.name} connected`);

    socket.on('request_data', async () => {
      try {
        const metrics = await getMetrics();
        const orders = await Orders.find().sort({ createdAt: -1 }).limit(20);

        socket.emit('update_metrics', metrics);
        socket.emit('update_orders', orders);
      } catch (err) {
        console.error('[Admin Dashboard] Error sending data:', err);
      }
    });

    // Watch for order updates
    const orderStream = Orders.watch();
    orderStream.on('change', async () => {
      try {
        const latestOrders = await Orders.find().sort({ createdAt: -1 }).limit(20);
        adminNamespace.emit('update_orders', latestOrders);
      } catch (err) {
        console.error('[Admin Dashboard] Error updating orders:', err);
      }
    });

    // Watch notifications
    const notificationsStream = Notifications.watch();
    notificationsStream.on('change', async ({ documentKey }) => {
      try {
        const notification = await Notifications.findById(documentKey._id);
        if (notification) {
          adminNamespace.emit('new_notification', notification);
        }
      } catch (err) {
        console.error('[Admin Dashboard] Error sending notification:', err);
      }
    });

    socket.on('clear_notifications', async () => {
      try {
        await Notifications.deleteMany({});
        socket.emit('new_notification', {
          message: 'All notifications cleared',
          date: new Date()
        });
      } catch (err) {
        console.error('[Admin Dashboard] Error clearing notifications:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Admin Dashboard] ${user.name} disconnected`);
    });
  });

  async function getMetrics() {
    const [revenue, userCount, productCount, categoryCount, orderCount, pendingOrders] =
      await Promise.all([
        Orders.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
        Users.countDocuments(),
        Products.countDocuments(),
        Categories.countDocuments(),
        Orders.countDocuments(),
        Orders.countDocuments({ status: 'pending' }),
      ]);

    return {
      revenue: revenue[0]?.total || 0,
      usercount: userCount,
      productcount: productCount,
      categorycount: categoryCount,
      ordercount: orderCount,
      pending_orders: pendingOrders,
    };
  }
};

