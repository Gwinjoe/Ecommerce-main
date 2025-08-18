const config = await fetch("/api/config");
const { ipdatakey } = await config.json();

const fetchCurrentUser = async () => {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();

    if (data.success) {
      let currentUser = data.data;
      return currentUser;
    }
  } catch (error) {
    console.error('Error fetching user:', error);
  }
};

const updateHeaderView = async () => {
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
  } catch (err) {
    console.log(err)
  }
}

async function useapi() {
  const response = await fetch(`https://api.ipdata.co?api-key=${ipdatakey}`);
  const response2 = await fetch("https://ipapi.co/json");
  const result1 = await response.json();
  const result2 = await response2.json();



  if (!result1 || result2) {
    return;
  }
  return {
    ipdata: result1,
    ipapi: result2
  }
}

const getUserLocation = async () => {
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

    return {
      geolocation: {
        lat: latitude,
        long: longitude,
        acc: accuracy
      },
      ipdetails: locationDetails
    }
  }



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
    const location = navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

    const response = await fetch("/api/edit_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ location })
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locationDetails })
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


