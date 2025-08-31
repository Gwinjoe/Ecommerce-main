import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Log script loading for debugging
console.log("profile.js loaded");

try {
  gsap.registerPlugin(ScrollTrigger);
} catch (error) {
  console.error("Failed to register GSAP ScrollTrigger:", error);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");

  // Fetch user data from API
  let userData = null;

  async function fetchUserData() {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();

      if (data.success) {
        userData = data.data;
        populateProfile(userData);
      } else {
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  function populateProfile(user) {
    // Update profile image
    const profileImgs = document.querySelectorAll('.profile-img, .profile-card-img');
    profileImgs.forEach(img => {
      if (user.avatar) img.src = user.avatar;
    });

    // Update profile text content
    document.getElementById('profile-fullname').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-address').textContent = user.address.address;
    document.getElementById('profile-city').textContent = user.address.city;
    document.getElementById('profile-state').textContent = user.address.state;
    document.getElementById('profile-country').textContent = user.address.country;
    document.getElementById('profile-phone').textContent = user.phone;
    document.getElementById('profile-status').textContent = user.status || (user.active ? 'Active' : 'Inactive');
    document.getElementById('profile-created').textContent = new Date(user.createdAt).toLocaleDateString();

    // Update header profile info
    const profileNameElements = document.querySelectorAll('.profile-name');
    profileNameElements.forEach(el => {
      el.textContent = user.name;
    });

    // Pre-fill edit form
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-address').value = user.address.address;
    document.getElementById('edit-city').value = user.address.city;
    document.getElementById('edit-state').value = user.address.state;
    document.getElementById('edit-country').value = user.address.country;
    document.getElementById('edit-phone').value = user.phone;
  }

  // Initialize by fetching user data
  fetchUserData();

  // Edit Profile Modal
  const editProfileBtn = document.querySelector(".edit-profile-btn");
  const editProfileModal = document.querySelector(".edit-profile-modal");
  const closeProfileBtn = document.querySelector(".close-profile");
  const editProfileForm = document.querySelector(".edit-profile-form");

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      if (editProfileModal) {
        editProfileModal.classList.add("active");
        gsap.fromTo(".edit-profile-content",
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
      }
    });
  }

  if (closeProfileBtn) {
    closeProfileBtn.addEventListener("click", () => {
      if (editProfileModal) {
        gsap.to(".edit-profile-content", {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => editProfileModal.classList.remove("active")
        });
      }
    });
  }

  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData()

      const name = document.getElementById('edit-name')?.value;
      const email = document.getElementById('edit-email')?.value;
      const address = document.getElementById('edit-address')?.value;
      const city = document.getElementById('edit-city')?.value;
      const state = document.getElementById('edit-state')?.value;
      const country = document.getElementById('edit-country')?.value;
      const phone = document.getElementById('edit-phone')?.value;
      const image = document.getElementById("edit-profile-pic").files[0]

      formData.append("name", name);
      formData.append("email", email);
      formData.append("address", address);
      formData.append("city", city);
      formData.append("state", state);
      formData.append("country", country);
      formData.append("phone", phone);
      formData.append("image", image)

      // Only add password if provided
      const password = document.getElementById('edit-password').value;
      if (password) {
        formData.append("password", password)
      }

      try {
        const response = await fetch('/api/edit_user_details', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          // Update UI with new data
          fetchUserData();

          // Close modal
          gsap.to(".edit-profile-content", {
            scale: 0.8,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => editProfileModal.classList.remove("active")
          });

          alert('Profile updated successfully!');
        } else {
          alert('Failed to update profile: ' + (data.message || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
      }
    });
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
    console.error("Error: Menu toggle elements not found");
  }

  // Theme Toggle
  const themeToggleBtn = document.querySelector(".theme-toggle-btn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      themeToggleBtn.querySelector("i")?.classList.toggle("fa-moon");
      themeToggleBtn.querySelector("i")?.classList.toggle("fa-sun");
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
    console.error("Error: Language selector elements not found");
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

  // Settings Modal
  const settingsBtn = document.querySelector(".settings-btn");
  const settingsModal = document.querySelector(".settings-modal");
  const closeSettings = document.querySelector(".close-settings");
  const saveSettings = document.querySelector(".save-settings");

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      if (settingsModal) {
        settingsModal.classList.add("active");
        gsap.fromTo(".settings-content",
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
      }
    });
  } else {
    console.error("Error: .settings-btn not found");
  }

  if (closeSettings) {
    closeSettings.addEventListener("click", () => {
      if (settingsModal) {
        gsap.to(".settings-content", {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => settingsModal.classList.remove("active")
        });
      }
    });
  } else {
    console.error("Error: .close-settings not found");
  }

  if (saveSettings) {
    saveSettings.addEventListener("click", () => {
      const form = document.querySelector(".settings-form");
      if (form) {
        const formData = {
          name: form.querySelector("#name")?.value,
          address: form.querySelector("#address")?.value,
          phone: form.querySelector("#phone")?.value,
          password: form.querySelector("#password")?.value
        };
        console.log("Settings form submission:", formData);
      }
      if (settingsModal) {
        gsap.to(".settings-content", {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => settingsModal.classList.remove("active")
        });
      }
    });
  } else {
    console.error("Error: .save-settings not found");
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

  // Close dropdowns and modals when clicking outside
  document.addEventListener("click", (e) => {
    if (languageToggle && languageOptions && !languageToggle.contains(e.target) && !languageOptions.contains(e.target)) {
      languageOptions.parentElement.classList.remove("active");
    }
    if (userProfile && !userProfile.contains(e.target)) {
      userProfile.classList.remove("active");
    }
    if (editProfileBtn && editProfileModal && !editProfileBtn.contains(e.target) && !document.querySelector(".edit-profile-content")?.contains(e.target)) {
      if (editProfileModal.classList.contains("active")) {
        gsap.to(".edit-profile-content", {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => editProfileModal.classList.remove("active")
        });
      }
    }
    if (settingsBtn && settingsModal && !settingsBtn.contains(e.target) && !document.querySelector(".settings-content")?.contains(e.target)) {
      if (settingsModal.classList.contains("active")) {
        gsap.to(".settings-content", {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => settingsModal.classList.remove("active")
        });
      }
    }
  });
});
