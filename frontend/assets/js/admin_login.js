import { gsap } from "gsap";
import { loadingIndicator } from "./loader.js";

// Log script loading for debugging
console.log("login.js loaded");

// Google Analytics event tracking function
function trackEvent(eventName, eventParams = {}) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, eventParams);
  } else {
    console.warn("Google Analytics not loaded, event not tracked:", eventName, eventParams);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");

  // Validate login form
  function validateForm() {
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    let isValid = true;

    // Reset error states
    document.querySelectorAll(".error-message").forEach(error => {
      error.textContent = "";
      error.classList.remove("active");
    });
    document.querySelectorAll("input").forEach(input => input.classList.remove("invalid"));

    // Validate email
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
      const error = emailInput?.nextElementSibling;
      if (error) {
        error.textContent = "Enter a valid email address";
        error.classList.add("active");
        emailInput.classList.add("invalid");
        gsap.from(error, { opacity: 0, y: 5, duration: 0.3, ease: "power3.out" });
      }
      isValid = false;
    }

    // Validate password
    if (!passwordInput || !passwordInput.value.trim()) {
      const error = passwordInput?.nextElementSibling;
      if (error) {
        error.textContent = "Password is required";
        error.classList.add("active");
        passwordInput.classList.add("invalid");
        gsap.from(error, { opacity: 0, y: 5, duration: 0.3, ease: "power3.out" });
      }
      isValid = false;
    }

    return isValid;
  }

  // Login button handler
  const loginBtn = document.querySelector(".login-btn");
  const form = document.querySelector("#form")
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (validateForm()) {
      const email = document.querySelector("#email")?.value;
      const password = document.querySelector("#password")?.value;
      //const rememberMe = document.querySelector("#remember-me")?.checked;
      gsap.to(loginBtn, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.in",
        onComplete: async () => {
          const response = await fetch("/api/admin_signin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
          });
          const { success, message, redirect } = await response.json();

          if (success) {
            window.location.href = redirect;
          } else {
            document.querySelector("#error").textContent = message;
            window.location.href = redirect;
          }

          gsap.to(loginBtn, { scale: 1, duration: 0.1 });
          console.log(`Login attempt: Email=${email}, RememberMe=${rememberMe}`);
          trackEvent("login_submit", { email: email, remember_me: rememberMe });
        }
      });
    } else {
      gsap.to(loginBtn, {
        x: -10,
        duration: 0.1,
        repeat: 3,
        yoyo: true,
        ease: "power2.inOut"
      });
      trackEvent("login_failed");
    }
  });


  // Input tracking
  const inputs = document.querySelectorAll(".login-form input");
  if (inputs.length) {
    inputs.forEach(input => {
      input.addEventListener("input", () => {
        trackEvent(input.dataset.gaEvent, { value: input.value });
      });
    });
  } else {
    console.error("Error: .login-form input elements not found");
  }

  // Remember Me checkbox
  const rememberMe = document.querySelector("#remember-me");
  if (rememberMe) {
    rememberMe.addEventListener("change", () => {
      trackEvent("remember_me", { checked: rememberMe.checked });
    });
  } else {
    console.error("Error: #remember-me not found");
  }

  // Forgot Password link
  const forgotPassword = document.querySelector(".forgot-password");
  if (forgotPassword) {
    forgotPassword.addEventListener("click", () => {
      gsap.to(forgotPassword, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.in",
        onComplete: () => {
          gsap.to(forgotPassword, { scale: 1, duration: 0.1 });
          trackEvent("forgot_password");
        }
      });
    });
  } else {
    console.error("Error: .forgot-password not found");
  }

  // Sign Up link
  const signupLink = document.querySelector(".signup-link a");
  if (signupLink) {
    signupLink.addEventListener("click", () => {
      gsap.to(signupLink, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.in",
        onComplete: () => {
          gsap.to(signupLink, { scale: 1, duration: 0.1 });
          trackEvent("signup_link");
        }
      });
    });
  } else {
    console.error("Error: .signup-link a not found");
  }

  // Animate login card
  const loginCard = document.querySelector(".login-card");
  if (loginCard) {
    gsap.from(loginCard, {
      opacity: 0,
      y: 50,
      duration: 0.7,
      ease: "power3.out"
    });
  } else {
    console.error("Error: .login-card not found");
  }

  // Animate form elements
  const formElements = document.querySelectorAll(".login-form .form-group, .login-form .form-options, .login-form .login-btn, .signup-link");
  if (formElements.length) {
    gsap.from(formElements, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.1,
      ease: "power3.out",
      delay: 0.2
    });
  } else {
    console.error("Error: Login form elements not found");
  }
});
