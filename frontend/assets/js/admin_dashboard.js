document.addEventListener('DOMContentLoaded', function() {
  const socket = io();
  const connectionStatus = document.createElement('div');
  connectionStatus.className = 'connection-status disconnected';
  connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
  document.body.appendChild(connectionStatus);

  socket.on('connect', () => {
    connectionStatus.className = 'connection-status connected';
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
    console.log('Connected to server');

    socket.emit('request_data');
  });

  socket.on('disconnect', () => {
    connectionStatus.className = 'connection-status disconnected';
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
    console.log('Disconnected from server');
  });

  socket.on('update_metrics', (data) => {
    updateMetrics(data);
  });

  socket.on('update_orders', (data) => {
    updateOrdersTable(data);
  });

  socket.on('new_notification', (data) => {
    addNotification(data);
  });

  socket.on('chat_notification', (data) => {
    updateChatNotification(data);
  });

  document.querySelector('.year').textContent = new Date().getFullYear();

  document.querySelector('.menu-toggle').addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('active');
  });

  document.querySelector('.theme-toggle-btn').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const icon = this.querySelector('i');
    if (document.body.classList.contains('dark-mode')) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
      localStorage.setItem('theme', 'dark');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
      localStorage.setItem('theme', 'light');
    }
  });

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    document.querySelector('.theme-toggle-btn i').classList.remove('fa-moon');
    document.querySelector('.theme-toggle-btn i').classList.add('fa-sun');
  }

  document.querySelector('.language-toggle').addEventListener('click', function() {
    document.querySelector('.language-selector').classList.toggle('active');
  });

  document.querySelectorAll('.language-options li').forEach(option => {
    option.addEventListener('click', function() {
      const lang = this.getAttribute('data-lang');
      document.querySelector('.language-selector').classList.remove('active');
      console.log('Language changed to:', lang);
    });
  });

  // Toggle user profile dropdown
  document.querySelector('.user-profile').addEventListener('click', function(e) {
    e.stopPropagation();
    this.classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function() {
    document.querySelector('.user-profile').classList.remove('active');
    document.querySelector('.language-selector').classList.remove('active');
  });

  // Notifications button
  document.querySelector('.notification-btn').addEventListener('click', function() {
    openModal('notifications-modal');
  });

  // Settings button
  document.querySelector('.settings-btn').addEventListener('click', function() {
    openModal('settings-modal');
  });

  // Modal functionality
  function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }

  document.querySelectorAll('.close-btn').forEach(button => {
    button.addEventListener('click', function() {
      const modalId = this.getAttribute('data-modal');
      document.getElementById(modalId).classList.remove('active');
    });
  });

  // Close modal when clicking outside
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });
  });

  // Scroll to top button
  const scrollTopBtn = document.querySelector('.scroll-top-btn');
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      scrollTopBtn.style.display = 'block';
    } else {
      scrollTopBtn.style.display = 'none';
    }
  });

  scrollTopBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Clear notifications
  document.getElementById('clear-notifications').addEventListener('click', function() {
    document.getElementById('notifications-list').innerHTML = '<p>No notifications available</p>';
    document.querySelector('.notification-count').textContent = '0';
    socket.emit('clear_notifications');
  });

  // Filter functionality
  document.querySelector('.reset-filters').addEventListener('click', function() {
    document.getElementById('status-filter').selectedIndex = 0;
    document.getElementById('category-filter').selectedIndex = 0;
    document.getElementById('amount-filter').selectedIndex = 0;
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('search').value = '';
    document.getElementById('sort-by').selectedIndex = 0;

    // Re-fetch orders without filters
    fetchOrdersData();
  });

  // Add event listeners to filter controls
  document.getElementById('status-filter').addEventListener('change', applyFilters);
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  document.getElementById('amount-filter').addEventListener('change', applyFilters);
  document.getElementById('start-date').addEventListener('change', applyFilters);
  document.getElementById('end-date').addEventListener('change', applyFilters);
  document.getElementById('search').addEventListener('input', applyFilters);
  document.getElementById('sort-by').addEventListener('change', applyFilters);

  // Initialize charts and fetch data
  fetchMetricsData();
  fetchOrdersData();

  function fetchMetricsData() {
    const endpoints = [
      '/api/revenue',
      '/api/usercount',
      '/api/productcount',
      '/api/brandcount',
      '/api/categorycount',
      '/api/ordercount',
      '/api/pending_orders'
    ];

    // Fetch data from each endpoint
    endpoints.forEach(endpoint => {
      fetch(endpoint)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            updateMetricDisplay(endpoint, data);
          }
        })
        .catch(error => {
          console.error(`Error fetching data from ${endpoint}:`, error);
        });
    });
  }

  function updateMetricDisplay(endpoint, data) {
    let metricElement;

    switch (endpoint) {
      case '/api/revenue':
        metricElement = document.querySelector('[data-metric="revenue"]');
        if (metricElement) metricElement.textContent = `₦${data.amount || 0}`;
        break;
      case '/api/usercount':
        metricElement = document.querySelector('[data-metric="total-users"]');
        if (metricElement) metricElement.textContent = data.count || 0;
        break;
      case '/api/productcount':
        metricElement = document.querySelector('[data-metric="total-products"]');
        if (metricElement) metricElement.textContent = data.count || 0;
        break;
      case '/api/categorycount':
        metricElement = document.querySelector('[data-metric="total-categories"]');
        if (metricElement) metricElement.textContent = data.count || 0;
        break;
      case '/api/ordercount':
        metricElement = document.querySelector('[data-metric="total-orders"]');
        if (metricElement) metricElement.textContent = data.count || 0;
        break;
      case '/api/pending_orders':
        metricElement = document.querySelector('[data-metric="pending-orders"]');
        if (metricElement) metricElement.textContent = data.count || 0;
        break;
    }
  }

  function fetchOrdersData() {
    fetch('/api/orders')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          processOrdersData(data.data);
          updateOrdersTable(data.data);
          initCharts(data.data);
        }
      })
      .catch(error => {
        console.error('Error fetching orders:', error);
      });
  }

  function processOrdersData(orders) {
    console.log('Orders data processed:', orders.length, 'orders');
  }

  // Function to apply filters to orders table
  function applyFilters() {
    const statusFilter = Array.from(document.getElementById('status-filter').selectedOptions).map(opt => opt.value);
    const categoryFilter = document.getElementById('category-filter').value;
    const amountFilter = document.getElementById('amount-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const sortBy = document.getElementById('sort-by').value;

    // Fetch orders and then apply filters
    fetch('/api/orders')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          let filteredOrders = data.data;

          // Apply status filter
          if (!statusFilter.includes('all') && statusFilter.length > 0) {
            filteredOrders = filteredOrders.filter(order => statusFilter.includes(order.status));
          }

          // Apply category filter
          if (categoryFilter !== 'all') {
            // This would need to be adjusted based on your actual data structure
            filteredOrders = filteredOrders.filter(order => {
              // Assuming each product has a category, we check if any product matches
              return order.products.some(product =>
                product.product.category === categoryFilter);
            });
          }

          // Apply amount filter
          if (amountFilter !== 'all') {
            filteredOrders = filteredOrders.filter(order => {
              const amount = parseFloat(order.totalPrice.$numberDecimal);
              if (amountFilter === '0-100') return amount >= 0 && amount <= 100;
              if (amountFilter === '100-500') return amount > 100 && amount <= 500;
              if (amountFilter === '500+') return amount > 500;
              return true;
            });
          }

          // Apply date filter
          if (startDate) {
            filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) >= new Date(startDate));
          }

          if (endDate) {
            filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) <= new Date(endDate));
          }

          // Apply search filter
          if (searchQuery) {
            filteredOrders = filteredOrders.filter(order =>
              order._id.toLowerCase().includes(searchQuery) ||
              order.customer.name.toLowerCase().includes(searchQuery)
            );
          }

          // Apply sorting
          filteredOrders.sort((a, b) => {
            const [field, direction] = sortBy.split('-');

            let valueA, valueB;

            switch (field) {
              case 'id':
                valueA = a._id;
                valueB = b._id;
                break;
              case 'date':
                valueA = new Date(a.createdAt);
                valueB = new Date(b.createdAt);
                break;
              case 'customer':
                valueA = a.customer.name;
                valueB = b.customer.name;
                break;
              case 'amount':
                valueA = parseFloat(a.totalPrice.$numberDecimal);
                valueB = parseFloat(b.totalPrice.$numberDecimal);
                break;
              default:
                valueA = a._id;
                valueB = b._id;
            }

            if (direction === 'asc') {
              return valueA > valueB ? 1 : -1;
            } else {
              return valueA < valueB ? 1 : -1;
            }
          });

          updateOrdersTable(filteredOrders);
        }
      })
      .catch(error => {
        console.error('Error fetching filtered orders:', error);
      });
  }

  // Function to update metrics
  function updateMetrics(data) {
    for (const [key, value] of Object.entries(data)) {
      const element = document.querySelector(`[data-metric="${key}"]`);
      if (element) {
        // Animate the value change
        const currentValue = parseInt(element.textContent.replace(/\D/g, ''));
        const newValue = parseInt(value);

        if (currentValue !== newValue) {
          let start = currentValue;
          const increment = newValue > currentValue ? 1 : -1;
          const duration = 1000; // ms
          const steps = 50;
          const stepTime = duration / steps;

          const timer = setInterval(() => {
            start += increment;
            element.textContent = key === 'revenue' ? `$${start}` : start.toLocaleString();

            if ((increment > 0 && start >= newValue) || (increment < 0 && start <= newValue)) {
              element.textContent = key === 'revenue' ? `$${newValue}` : newValue.toLocaleString();
              clearInterval(timer);
            }
          }, stepTime);
        }
      }
    }
  }

  // Function to update orders table
  function updateOrdersTable(orders) {
    const tableBody = document.getElementById('orders-table-body');
    tableBody.innerHTML = '';

    if (orders.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders found</td></tr>';
      return;
    }

    orders.forEach(order => {
      const row = document.createElement('tr');
      row.setAttribute('data-status', order.status);
      row.setAttribute('data-date', order.createdAt);
      row.setAttribute('data-category', 'tools'); // Default category, adjust based on your data
      row.setAttribute('data-amount', parseFloat(order.totalPrice.$numberDecimal));

      // Determine the primary category from products
      let category = 'Tools';
      if (order.products && order.products.length > 0) {
        // This is a simplified approach - adjust based on your actual product data structure
        if (order.products.some(p => p.product.name.toLowerCase().includes('laser'))) {
          category = 'Electronics';
        } else if (order.products.some(p => p.product.name.toLowerCase().includes('drill'))) {
          category = 'Tools';
        }
      }

      row.innerHTML = `
                <td>${order.payment.reference}</td>
                <td>${order.customer.name}</td>
                <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                <td>${category}</td>
                <td>₦${parseFloat(order.totalPrice.$numberDecimal).toLocaleString()}</td>
                <td class="status ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</td>
                <td><button class="view-order-btn" data-order-id="${order._id}">View</button></td>
            `;

      tableBody.appendChild(row);
    });

    // Add event listeners to view buttons
    document.querySelectorAll('.view-order-btn').forEach(button => {
      button.addEventListener('click', function() {
        const orderId = this.getAttribute('data-order-id');
        window.location.href = `/admin/order_details?id=${orderId}`;
      });
    });
  }

  // Function to add notification
  function addNotification(notification) {
    const notificationsList = document.getElementById('notifications-list');
    const notificationCount = document.querySelector('.notification-count');

    // Clear "no notifications" message if it exists
    if (notificationsList.innerHTML.includes('No notifications available')) {
      notificationsList.innerHTML = '';
    }

    // Create notification element
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('notification-item');
    notificationElement.innerHTML = `
            <p>${notification.message}</p>
            <span>${new Date(notification.date).toLocaleString()}</span>
        `;

    // Add to top of list
    if (notificationsList.firstChild) {
      notificationsList.insertBefore(notificationElement, notificationsList.firstChild);
    } else {
      notificationsList.appendChild(notificationElement);
    }

    // Update notification count
    const currentCount = parseInt(notificationCount.textContent);
    notificationCount.textContent = currentCount + 1;
  }

  // Function to update chat notification
  function updateChatNotification(data) {
    const chatNotification = document.querySelector('.sidebar-item:nth-child(8) .unread-count');
    if (chatNotification) {
      chatNotification.textContent = data;
    }
  }

  // Initialize charts with order data
  function initCharts(orders) {
    // Process orders for the chart data
    const ordersByDate = processOrdersForChart(orders);

    // Orders per day chart
    const ordersCtx = document.getElementById('ordersChart').getContext('2d');
    new Chart(ordersCtx, {
      type: 'line',
      data: {
        labels: ordersByDate.labels,
        datasets: [{
          label: 'Orders',
          data: ordersByDate.values,
          backgroundColor: 'rgba(242, 140, 40, 0.2)',
          borderColor: 'rgba(242, 140, 40, 1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              drawBorder: false
            },
            title: {
              display: true,
              text: 'Number of Orders'
            }
          },
          x: {
            grid: {
              display: false
            },
            title: {
              display: true,
              text: 'Date'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    // Mini charts for metrics
    document.querySelectorAll('.metric-chart').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['', '', '', '', '', ''],
          datasets: [{
            data: [12, 14, 10, 16, 13, 15],
            borderColor: 'rgba(242, 140, 40, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            pointRadius: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              display: false
            },
            x: {
              display: false
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    });
  }

  // Process orders data for the chart
  function processOrdersForChart(orders) {
    // Group orders by date
    const ordersByDate = {};

    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      if (!ordersByDate[date]) {
        ordersByDate[date] = 0;
      }
      ordersByDate[date]++;
    });

    // Sort dates and get the last 7 days
    const dates = Object.keys(ordersByDate).sort((a, b) => new Date(a) - new Date(b));
    const recentDates = dates.slice(-7);

    // Prepare data for the chart
    const labels = recentDates;
    const values = recentDates.map(date => ordersByDate[date]);

    return { labels, values };
  }
});
