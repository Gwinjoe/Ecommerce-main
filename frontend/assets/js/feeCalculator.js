// Shipping Fee Calculator (Port Harcourt as Origin)

// Distances in km (approx road distances from Port Harcourt)
export const distances = {
  "Abia": 61,
  "Adamawa": 1080,
  "Akwa Ibom": 72,
  "Anambra": 182,
  "Bauchi": 950,
  "Bayelsa": 125,
  "Benue": 620,
  "Borno": 1230,
  "Cross River": 220,
  "Delta": 260,
  "Ebonyi": 250,
  "Edo": 435,
  "Ekiti": 650,
  "Enugu": 280,
  "FCT (Abuja)": 620,
  "Gombe": 1020,
  "Imo": 88,
  "Jigawa": 1085,
  "Kaduna": 850,
  "Kano": 970,
  "Katsina": 1150,
  "Kebbi": 1180,
  "Kogi": 540,
  "Kwara": 700,
  "Lagos": 615,
  "Nasarawa": 600,
  "Niger": 740,
  "Ogun": 580,
  "Ondo": 660,
  "Osun": 720,
  "Oyo": 690,
  "Plateau": 860,
  "Rivers": 0,   // same state
  "Sokoto": 1250,
  "Taraba": 1000,
  "Yobe": 1150,
  "Zamfara": 1100
};

// Function to calculate shipping fee
export function calculateShippingFee(itemPrice, destination, ratePerKm = 20) {
  if (!distances[destination]) {
    return {
      totalFee: 0,

    }
  }

  let distance = distances[destination];
  let fixedFee = itemPrice * 0.05; // 5%
  let variableFee = distance * ratePerKm;
  let totalFee = fixedFee + variableFee;

  return {
    destination: destination,
    distance: distance,
    fixedFee: fixedFee,
    variableFee: variableFee,
    totalFee: totalFee
  };
}

// Example usage:
let itemPrice = 100000; // ₦100,000
let result = calculateShippingFee(itemPrice, "Lagos", 50);

console.log(`Shipping to ${result.destination}:`);
console.log(`Distance: ${result.distance} km`);
console.log(`Fixed Fee (5%): ₦${result.fixedFee}`);
console.log(`Distance Fee: ₦${result.variableFee}`);
console.log(`Total Shipping Fee: ₦${result.totalFee}`);
