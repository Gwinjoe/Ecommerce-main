export const fetchCurrentUser = async () => {
  try {
    const response = await fetch('/api/user');
    const data = await response.json();

    if (data.success) {
      currentUser = data.data;
      // Pre-fill form with user data if available
      if (currentUser) {
        document.getElementById('full-name').value = currentUser.name || '';
        document.getElementById('email').value = currentUser.email || '';
        document.getElementById('address').value = currentUser.address || '';
        document.getElementById('city').value = currentUser.city || '';
        document.getElementById('postal-code').value = currentUser.postalCode || '';
      }
    }
  } catch (error) {
    console.error('Error fetching user:', error);
  }
};


export function getUserLocation() {
  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  function successCallback(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    console.log(`Latitude: ${latitude}`);
    console.log(`Longitude: ${longitude}`);
    console.log(`Accuracy: ${accuracy} meters`);
  }

  function errorCallback(error) {
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
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  } else {
    console.error("Geolocation is not supported by this browser.");
  }
}
