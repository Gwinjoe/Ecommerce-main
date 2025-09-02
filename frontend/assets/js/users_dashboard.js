import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { updateHeader } from "./user-details.js"

// Log script loading for debugging
console.log("dashboard.js loaded");

try {
  gsap.registerPlugin(ScrollTrigger);
} catch (error) {
  console.error("Failed to register GSAP ScrollTrigger:", error);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");

  updateHeader();

  let currentChart = null;
  let orderData = [];

  // Fetch data from APIs
  async function fetchDashboardData() {
    try {
      // Fetch order count
      const orderCountResponse = await fetch('/api/user_order_count');
      const orderCountData = await orderCountResponse.json();
      if (orderCountData.success) {
        document.getElementById('total-orders').textContent = orderCountData.count;
      }

      // Fetch pending order count
      const pendingOrderResponse = await fetch('/api/pending_order_count');
      const pendingOrderData = await pendingOrderResponse.json();
      if (pendingOrderData.success) {
        document.getElementById('pending-orders').textContent = pendingOrderData.count;
      }

      // Fetch wishlist count
      const wishlistResponse = await fetch('/api/wishlist_count');
      const wishlistData = await wishlistResponse.json();
      if (wishlistData.success) {
        document.getElementById('wishlist-count').textContent = wishlistData.count;
      }

      // Fetch user orders for chart
      const ordersResponse = await fetch('/api/user_orders');
      const ordersData = await ordersResponse.json();
      if (ordersData.success) {
        orderData = ordersData.result;
        renderChart();
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }

  // Process order data for chart
  function processOrderData(filter = "6months") {
    if (!orderData.length) return { labels: [], data: [] };

    // Group orders by month
    const ordersByMonth = {};

    orderData.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const monthYear = `${orderDate.getMonth() + 1}/${orderDate.getFullYear()}`;

      if (!ordersByMonth[monthYear]) {
        ordersByMonth[monthYear] = 0;
      }
      ordersByMonth[monthYear]++;
    });

    // Sort by date
    const sortedMonths = Object.keys(ordersByMonth).sort((a, b) => {
      const [aMonth, aYear] = a.split('/').map(Number);
      const [bMonth, bYear] = b.split('/').map(Number);

      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });

    // Format labels and data based on filter
    let labels = [];
    let data = [];

    if (filter === "all") {
      // Group by year for "all time" view
      const ordersByYear = {};

      orderData.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const year = orderDate.getFullYear().toString();

        if (!ordersByYear[year]) {
          ordersByYear[year] = 0;
        }
        ordersByYear[year]++;
      });

      labels = Object.keys(ordersByYear).sort();
      data = labels.map(year => ordersByYear[year]);
    } else {
      const monthsToShow = filter === "6months" ? 6 : 12;
      const currentDate = new Date();

      // Generate labels for the last X months
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);

        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        labels.push(date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear());
        data.push(ordersByMonth[monthYear] || 0);
      }
    }

    return { labels, data };
  }

  // Render order chart
  function renderChart(filter = "6months", type = "line") {
    const chartCanvas = document.getElementById("orderChart");
    if (!chartCanvas) {
      console.error("Error: #orderChart canvas not found");
      return;
    }

    if (currentChart) {
      currentChart.destroy();
    }

    try {
      const chartData = processOrderData(filter);

      currentChart = new Chart(chartCanvas, {
        type: type,
        data: {
          labels: chartData.labels,
          datasets: [{
            label: "Orders",
            data: chartData.data,
            borderColor: "#f28c28",
            backgroundColor: type === "line" ? "rgba(242, 140, 40, 0.2)" : "#f28c28",
            fill: type === "line",
            tension: type === "line" ? 0.4 : 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Number of Orders" }
            },
            x: { title: { display: true, text: filter === "all" ? "Year" : "Month" } }
          },
          plugins: {
            legend: { display: true, position: "top" }
          }
        }
      });
      console.log(`Chart rendered with filter: ${filter}, type: ${type}`);
      gsap.from(".order-chart", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power3.out"
      });
    } catch (error) {
      console.error("Error rendering chart:", error);
    }
  }

  // Export chart data as CSV
  function exportChartData(filter) {
    const data = processOrderData(filter);
    const csv = ["Period,Orders"];
    data.labels.forEach((label, i) => {
      csv.push(`${label},${data.data[i]}`);
    });

    // Create download link
    const blob = new Blob([csv.join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-history-${filter}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Initialize dashboard data
  try {
    fetchDashboardData();
  } catch (error) {
    console.error("Error initializing dashboard data:", error);
  }

  // Chart filter
  const chartFilter = document.getElementById("chartFilter");
  if (chartFilter) {
    chartFilter.addEventListener("change", (e) => {
      const filter = e.target.value;
      console.log(`Chart filter changed to: ${filter}`);
      renderChart(filter, document.getElementById("chartType")?.value || "line");
    });
  } else {
    console.error("Error: #chartFilter not found");
  }

  // Chart type
  const chartType = document.getElementById("chartType");
  if (chartType) {
    chartType.addEventListener("change", (e) => {
      const type = e.target.value;
      console.log(`Chart type changed to: ${type}`);
      renderChart(document.getElementById("chartFilter")?.value || "6months", type);
    });
  } else {
    console.error("Error: #chartType not found");
  }

  // Export chart button
  const exportChartBtn = document.querySelector(".export-chart-btn");
  if (exportChartBtn) {
    exportChartBtn.addEventListener("click", () => {
      const filter = document.getElementById("chartFilter")?.value || "6months";
      console.log(`Exporting chart data for: ${filter}`);
      exportChartData(filter);
    });
  } else {
    console.error("Error: .export-chart-btn not found");
  }

  // Refresh metrics
  const refreshMetricsBtn = document.querySelector(".refresh-metrics-btn");
  if (refreshMetricsBtn) {
    refreshMetricsBtn.addEventListener("click", () => {
      fetchDashboardData();
      console.log("Metrics refreshed");
      gsap.from(".dashboard-card", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.1,
        ease: "power3.out"
      });
    });
  } else {
    console.error("Error: .refresh-metrics-btn not found");
  }

  // Animate dashboard cards
  const dashboardCards = document.querySelectorAll(".dashboard-card");
  if (dashboardCards.length) {
    gsap.from(".dashboard-card", {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.1,
      ease: "power3.out"
    });
  } else {
    console.error("Error: .dashboard-card elements not found");
  }

  // Header Menu Toggle
  const menuToggle = document.querySelector(".menu-toggle");
  const navList = document.querySelector(".nav-list");
  const menuIcon = document.querySelector(".menu-icon");
  if (menuToggle && navList && menuIcon) {
    menuToggle.addEventListener("click", () => {
      navList.classList.toggle("active");
      menuIcon.classList.toggle("fa-bars");
      menuIcon.classList.toggle("fa-times");
      gsap.fromTo(".nav-item",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
      );
    });
  } else {
    console.error("Error: Menu toggle elements not found (.menu-toggle, .nav-list, .menu-icon)");
  }

  // Theme Toggle
  const themeToggleBtn = document.querySelector(".theme-toggle-btn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const icon = themeToggleBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-moon");
        icon.classList.toggle("fa-sun");
      }
      gsap.to("body", {
        backgroundColor: document.body.classList.contains("dark-mode") ? "#1a1a1a" : "#e5e5e5",
        duration: 0.5
      });
    });
  } else {
    console.error("Error: .theme-toggle-btn not found");
  }

  // Language Selector
  const languageToggle = document.querySelector(".language-toggle");
  const languageOptions = document.querySelector(".language-options");
  if (languageToggle && languageOptions) {
    languageToggle.addEventListener("click", () => {
      languageOptions.parentElement.classList.toggle("active");
      gsap.fromTo(".language-options li",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.1, ease: "power2.out" }
      );
    });
    languageOptions.querySelectorAll("li").forEach(option => {
      option.addEventListener("click", () => {
        const lang = option.dataset.lang;
        console.log(`Switch to language: ${lang}`);
        languageOptions.parentElement.classList.remove("active");
      });
    });
  } else {
    console.error("Error: Language selector elements not found (.language-toggle, .language-options)");
  }

  // Profile Dropdown
  const userProfile = document.querySelector(".user-profile");
  if (userProfile) {
    userProfile.addEventListener("click", () => {
      userProfile.classList.toggle("active");
      gsap.fromTo(".profile-dropdown li",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.1, ease: "power2.out" }
      );
    });
  } else {
    console.error("Error: .user-profile not found");
  }

  // Scroll to Top
  const scrollTopBtn = document.querySelector(".scroll-top-btn");
  if (scrollTopBtn) {
    window.addEventListener("scroll", () => {
      scrollTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
    });
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  } else {
    console.error("Error: .scroll-top-btn not found");
  }

  // Dynamic Year
  const yearElement = document.querySelector(".year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  } else {
    console.error("Error: .year element not found");
  }
});
