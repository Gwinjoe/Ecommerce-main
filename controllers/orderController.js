const Orders = require("../models/orderSchema");
const User = require("../models/userModel")
const Products = require("../models/productSchema")
const { dohash, dohashValidation, hmacProcess } = require("../utils/hashing");
const { sendMail } = require("../middlewares/sendmail")

exports.revenue = async (req, res) => {
  try {
    const orders = await Orders.find({ status: 'delivered' });
    console.log(orders)
    let totalRevenue = 0;
    if (orders.length) {
      orders.forEach(order => {
        const orderTotal = parseFloat(order.totalPrice);
        totalRevenue += orderTotal;
        console.log(totalRevenue)
      });
    } else {
      const orderTotal = parseFloat(orders.totalPrice);
      totalRevenue += orderTotal;
    }
    console.log("totalRevenue - " + totalRevenue)
    res.status(200).json({ success: true, amount: totalRevenue })
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return 0;
  }
}

exports.order_count = async (req, res) => {
  const count = await Orders.countDocuments({});
  res.status(200).json({ success: true, count })
}

exports.pending_order_count = async (req, res) => {
  const count = await Orders.countDocuments({ status: "pending" });
  res.status(200).json({ success: true, count })
}

exports.get_user_orders_count = async (req, res) => {
  const id = req.user._id;
  try {
    const count = await Orders.countDocuments({ customer: id });
    res.status(200).json({ success: true, count })
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Internal Server Error" })
  }
}

exports.getOrders = async (req, res) => {
  try {
    const data = await Orders.find().sort({ createdAt: -1 }).populate("customer").populate({ path: "products.product", select: "name price" });
    if (!data) {
      return res.status(401).json({ success: false, message: "No Order Found!" });
    }
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err) {
      console.log(err)
    }
  }
}

exports.get_order_by_id = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Orders.findById(id).populate("customer").populate({ path: "products.product", select: "name price" });
    if (!result) {
      return res.status(401).json({ success: false, message: "No order matches that id" });
    }

    res.status(201).json({ success: true, result })
  } catch (err) {
    if (err) console.log(err)
  }
}
exports.get_user_orders = async (req, res) => {
  const id = req.user._id;

  try {
    const result = await Orders.find({ customer: id }).populate("customer").populate({ path: "products.product", select: "name price images" });
    if (!result) {
      return res.status(401).json({ success: false, message: "No order matches that id" });
    }

    res.status(201).json({ success: true, result })
  } catch (err) {
    if (err) console.log(err)
  }
}
exports.get_pending_user_orders_count = async (req, res) => {
  const id = req.user._id;

  try {
    const count = await Orders.countDocuments({ customer: id, status: "pending" })
    res.status(201).json({ success: true, count })
  } catch (err) {
    if (err) console.log(err)
  }
}

exports.add_order = async (req, res) => {
  const { orderId, items, customer, totalPrice, payment, coupon } = req.body;
  try {
    console.log(orderId, items, customer);
    let { userId, address, postalCode, phone, country, city, email, name, state } = customer;

    const existingUser = await User.findOne({ email });
    const specialchars = ["@", "!", "&", "^", "#"];
    const password = `${name.split(" ")[0]}${specialchars[Math.floor(Math.random * specialchars.length)] || specialchars[0]}${Math.floor(Math.random() * 3000000)}`;
    console.log(password)
    const hashedPassword = await dohash(password, 12);
    if (!existingUser) {
      const newUser = await new User({
        email,
        name,
        phone,
        address: {
          address,
          country,
          city,
          postalCode: postalCode ? postalCode : "",
          state,
        },
        password: hashedPassword
      })

      const result = await newUser.save();
      await sendMail({
        to: `${email}`,
        subject: 'Welcome to SWISStools',
        template: 'welcome',
        data: { name: `${name}`, verification_link: `https://swisstools.store/verify/${result._id}` }
      })
      // 3. Guest welcome (password)
      await sendMail({
        to: `${email}`,
        subject: 'Account created for you',
        template: 'guest-welcome',
        data: { name: `${name}`, password: `${password}`, login_link: 'https://swisstools.store/login' }
      });

      console.log(result)
      userId = result._id;

    } else {
      existingUser.phone = phone
      existingUser.address = {
        address, country, city, postalCode: postalCode ? postalCode : "", state
      }
      const result = await existingUser.save();
      userId = result._id;
    }
    const products = items.map((item) => { return { product: item.id, quantity: item.quantity, totalPrice: item.price * item.quantity } }) || [];
    const newOrder = await new Orders({
      orderId,
      products,
      customer: userId,
      totalPrice: totalPrice.total,
      coupon,
      payment,
    })

    const result = await newOrder.save();
    let html = "";
    items.forEach((item) => {
      const h = `<li>${item.name} x${item.quantity}</li>`
      html += h
    })
    await sendMail({
      to: `${email}`,
      subject: 'Your order is received',
      template: 'order-confirmation',
      data: {
        name: `${name}`,
        order_id: `${result.payment.reference}`,
        order_total: `${result.totalPrice}`,
        order_items: `<ul>${html}</ul>`,
        order_link: 'https://swisstools.store/orders/'
      }
    });


    console.log(result)
    res.status(201).json({ success: true, message: "Your order has been created successfuly", result });
  } catch (error) {
    console.log(error)
  }
}

exports.edit_order = async (req, res) => {
  const { id, status } = req.body;
  try {
    const existingOrder = await Orders.findById(id).populate({ path: "customer", select: "email name" }).populate({ path: "products.product", select: "name price" });

    if (!existingOrder) {
      return res.status(401).json({ success: false, message: "Cannot find Order" });
    }

    if (status) {
      existingOrder.status = status;
    }

    const results = await existingOrder.save();
    console.log(results)
    let html = "";
    results.products.forEach((item) => {
      const h = `<li>${item.product.name} x${item.quantity}</li>`
      html += h
    })
    await sendMail({
      to: `${results.customer.email}`,
      subject: `Your order has been ${results.status}`,
      template: 'order-confirmation',
      data: {
        name: `${results.customer.name}`,
        order_id: `${results.payment.reference}`,
        order_total: `${results.totalPrice}`,
        order_items: `<ul>${html}</ul>`,
        order_link: 'https://swisstools.store/orders/'
      }
    });

    res.status(201).json({ success: true, message: "Order Status Updated", results })
  } catch (err) {
    if (err) console.log(err)
  }
}


exports.delete_order = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Orders.findByIdAndDelete(id);
    if (!result) {
      return res.status(401).json({ success: false, message: "couldn't find and Delete the resource you are looking for" });
    }
    res.status(201).json({ success: true, message: "Order Deleted!" });
  } catch (err) {
    if (err) console.log(err)
  }
}


exports.editMultipleOrders = async (req, res) => {
  const { selectedIds, status } = req.body;
  try {
    const orderIds = selectedIds || [];
    for (const id of orderIds) {
      const existingOrder = await Orders.findById(id);
      if (!existingOrder) {
        return res.status(401).json({ success: false, message: "Couldn't find resources to be updated" });
      }

      if (!status) {
        return res.status(401).json({ success: false, message: "Invalid OrderId" });
      }

      existingOrder.status = status;
      await existingOrder.save();
    }
    res.status(201).json({ success: true, message: "Selected orders updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.delete_multiple_orders = async (req, res) => {
  console.log(req.body);
  const { selectedIds } = req.body;
  try {
    const orderIds = selectedIds || [];
    for (const id of orderIds) {
      const order = await Orders.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'order not found' });
      }
      const result = await Orders.findByIdAndDelete(id);
      if (!result) {
        return res.status(401).json({ success: false, message: "Couldn't find resource to be deleted" });
      }
    }
    res.status(201).json({ success: true, message: "Selected Items Deleted!" });
  } catch (err) {
    if (err) {
      console.log(err)
      res.status(500).json({ success: false, message: "Internal Server Error" })
    }
  }

}
