export const getConfig = async () => {
  const config = await fetch("/api/config");
  const { ipdatakey } = await config.json();
  return ipdatakey
}
export const fetchCurrentUser = async () => {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();

    if (data.success) {
      let currentUser = data.data;
      return currentUser;
    } else {

      return { success: false, message: "user not found" };
    }

  } catch (error) {
    console.error('Error fetching user:', error);
  }
};

export const updateCartView = () => {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartContainer = document.querySelector(".cart-count")
  if (cartContainer) {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartContainer.textContent = totalItems;
  }
}
export const updateHeaderView = async () => {

  try {
    const currentUser = await fetchCurrentUser();
    if (currentUser) {
      const authlinks = document.querySelector(".auth-links");
      const html = `
      <i class="fas fa-user"></i>
      <a href="/dashboard">Dashboard</a>
`;
      authlinks.innerHTML = html
    }
    updateCartView();

  } catch (err) {
    console.log(err)
  }
}
export const updateHeader = async () => {
  try {
    const user = await fetchCurrentUser();
    if (user) {
      // Update profile image
      const profileImages = document.querySelectorAll('.profile-img, .profile-card-img');
      profileImages.forEach(img => {
        if (user.avatar) {
          img.src = user.avatar;
          img.alt = `${user.name}'s Profile`;
        }
      });

      // Update profile name
      const profileNameElements = document.querySelectorAll('.profile-name');
      profileNameElements.forEach(el => {
        el.textContent = user.name;
      });

      // Update profile status
      const profileStatusElements = document.querySelectorAll('.profile-status');
      profileStatusElements.forEach(el => {
        el.textContent = user.status || (user.active ? 'Active' : 'Inactive');
        el.style.color = user.active ? '#f28c28' : '#dc3545';
      });

      console.log('Header updated with user data');
    } else {
      console.log('No user data available');
    }
  } catch (error) {
    console.error('Error updating header:', error);
  }
};

export async function useapi() {
  const ipdatakey = await getConfig();
  const response = await fetch(`https://api.ipdata.co?api-key=${ipdatakey}`);
  const response2 = await fetch("https://ipapi.co/json");
  const result1 = await response.json();
  const result2 = await response2.json();

  if (!result1 && !result2) {
    return;
  }
  console.log("ipdata: " + result1)
  console.log("ipapi: " + result2)
  return {
    ipdata: result1 ? result1 : {},
    ipapi: result2 ? result2 : {}
  }
}

export const getUserLocation = async () => {
  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  async function successCallback(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    console.log(`Latitude: ${latitude}`);
    console.log(`Longitude: ${longitude}`);
    console.log(`Accuracy: ${accuracy} meters`);

    const locationDetails = await useapi();
    console.log("successfull - " + locationDetails)
    return {
      geolocation: {
        lat: latitude,
        long: longitude,
        acc: accuracy
      },
      ipdetails: locationDetails
    }
  }

  const user = await fetchCurrentUser();

  async function errorCallback(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error("User denied the request for Geolocation.");
        break;
      case error.POSITION_UNAVAILABLE:
        console.error("Location information is unavailable.");
        break;
      case error.TIMEOUT:
        console.error("The request to get user location timed out.");
        break;
      case error.UNKNOWN_ERROR:
        console.error("An unknown error occurred.");
        break;
    }

    const locationDetails = await useapi();
    console.log(locationDetails)
    return {
      geolocation: {
        lat: "",
        long: "",
        acc: "",
      },
      ipdetails: locationDetails
    };
  }

  if (navigator.geolocation) {
    const locationDetails = navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

    const response = await fetch("/api/edit_user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: user ? user._id : "", location: locationDetails })
    });

    const { success, results } = await response.json();
    if (success) {
      console.log(results)
    }
    return location;
  } else {
    console.error("Geolocation is not supported by this browser.");
    const locationDetails = await useapi();
    const response = await fetch("/api/edit_user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: user ? user._id : "", location: locationDetails })
    });

    const { success, results } = await response.json();
    if (success) {
      console.log(results)
    }
    return {
      geolocation: {
        lat: "",
        long: "",
        acc: "",
      },
      ipdetails: locationDetails
    };

  }
}

