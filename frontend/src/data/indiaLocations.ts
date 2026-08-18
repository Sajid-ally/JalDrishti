// src/data/indiaLocations.ts
// Comprehensive administrative dataset for All 36 Indian States/UTs,
// Normalized City/District mappings, and Granular Locality Coordinates.

export interface LocalityCoord {
  name: string;
  lat: number;
  lng: number;
  zoom?: number;
}

export const ALL_INDIAN_STATES: string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const STATE_CITIES_MAP: Record<string, string[]> = {
  "Uttar Pradesh": [
    "Kanpur",
    "Lucknow",
    "Varanasi",
    "Prayagraj",
    "Agra",
    "Ghaziabad",
    "Noida",
    "Meerut",
    "Bareilly",
    "Aligarh",
    "Moradabad",
    "Saharanpur",
    "Gorakhpur",
    "Ayodhya",
    "Jhansi",
    "Mathura",
    "Firozabad",
    "Muzaffarnagar",
  ],
  Maharashtra: [
    "Mumbai",
    "Pune",
    "Nagpur",
    "Thane",
    "Nashik",
    "Aurangabad",
    "Navi Mumbai",
    "Solapur",
    "Kolhapur",
    "Amravati",
  ],
  Delhi: [
    "New Delhi",
    "Central Delhi",
    "South Delhi",
    "North Delhi",
    "East Delhi",
    "West Delhi",
    "Dwarka",
    "Rohini",
  ],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
    "Tirunelveli",
    "Vellore",
    "Erode",
  ],
  Karnataka: [
    "Bengaluru",
    "Mysuru",
    "Hubballi",
    "Mangaluru",
    "Belagavi",
    "Kalaburagi",
    "Davanagere",
  ],
  "West Bengal": [
    "Kolkata",
    "Howrah",
    "Durgapur",
    "Asansol",
    "Siliguri",
    "Bardhaman",
  ],
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Bhavnagar",
    "Jamnagar",
    "Gandhinagar",
  ],
  Rajasthan: [
    "Jaipur",
    "Jodhpur",
    "Kota",
    "Bikaner",
    "Ajmer",
    "Udaipur",
    "Bhilwara",
  ],
  Telangana: [
    "Hyderabad",
    "Warangal",
    "Nizamabad",
    "Karimnagar",
    "Khammam",
  ],
  "Madhya Pradesh": [
    "Indore",
    "Bhopal",
    "Jabalpur",
    "Gwalior",
    "Ujjain",
    "Sagar",
  ],
  Bihar: [
    "Patna",
    "Gaya",
    "Bhagalpur",
    "Muzaffarpur",
    "Purnia",
    "Darbhanga",
  ],
  Odisha: [
    "Bhubaneswar",
    "Cuttack",
    "Rourkela",
    "Puri",
    "Berhampur",
    "Sambalpur",
  ],
  Kerala: [
    "Thiruvananthapuram",
    "Kochi",
    "Kozhikode",
    "Thrissur",
    "Kollam",
    "Kannur",
  ],
  Punjab: [
    "Ludhiana",
    "Amritsar",
    "Jalandhar",
    "Patiala",
    "Bathinda",
  ],
  Haryana: [
    "Gurugram",
    "Faridabad",
    "Panipat",
    "Ambala",
    "Karnal",
    "Rohtak",
  ],
  Uttarakhand: [
    "Dehradun",
    "Haridwar",
    "Roorkee",
    "Haldwani",
    "Rishikesh",
    "Nainital",
  ],
  Jharkhand: [
    "Ranchi",
    "Jamshedpur",
    "Dhanbad",
    "Bokaro",
    "Deoghar",
  ],
  Assam: [
    "Guwahati",
    "Silchar",
    "Dibrugarh",
    "Jorhat",
    "Nagaon",
  ],
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada",
    "Guntur",
    "Nellore",
    "Kurnool",
    "Tirupati",
  ],
  "Chhattisgarh": [
    "Raipur",
    "Bhilai",
    "Bilaspur",
    "Korba",
    "Durg",
  ],
  "Goa": [
    "Panaji",
    "Margao",
    "Vasco da Gama",
    "Mapusa",
    "Ponda",
  ],
  "Himachal Pradesh": [
    "Shimla",
    "Dharamshala",
    "Mandi",
    "Solan",
    "Kullu",
  ],
  "Jammu and Kashmir": [
    "Srinagar",
    "Jammu",
    "Anantnag",
    "Baramulla",
  ],
  "Ladakh": [
    "Leh",
    "Kargil",
  ],
  "Chandigarh": [
    "Chandigarh City",
    "Sector 17",
    "Sector 35",
    "Manimajra",
  ],
  "Puducherry": [
    "Pondicherry Town",
    "Ozhukarai",
    "Karaikal",
    "Mahe",
  ],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar"],
  "Manipur": ["Imphal", "Churachandpur", "Thoubal"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  "Andaman and Nicobar Islands": ["Port Blair", "Havelock Island", "Diglipur"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy"],
};

export const CITY_LOCALITIES_MAP: Record<string, LocalityCoord[]> = {
  Kanpur: [
    { name: "Colonelganj", lat: 26.4675, lng: 80.3325, zoom: 17 },
    { name: "Bakarmandi", lat: 26.4635, lng: 80.3295, zoom: 17 },
    { name: "Lakarmandi", lat: 26.4560, lng: 80.3320, zoom: 17 },
    { name: "Civil Lines", lat: 26.4760, lng: 80.3465, zoom: 17 },
    { name: "Kidwai Nagar", lat: 26.4410, lng: 80.3420, zoom: 16 },
    { name: "Swaroop Nagar", lat: 26.4820, lng: 80.3080, zoom: 17 },
    { name: "Kakadeo", lat: 26.4735, lng: 80.2930, zoom: 17 },
    { name: "Kalyanpur", lat: 26.5037, lng: 80.2525, zoom: 16 },
    { name: "Govind Nagar", lat: 26.4672, lng: 80.3047, zoom: 16 },
    { name: "Barra", lat: 26.4280, lng: 80.3000, zoom: 16 },
    { name: "Chakeri", lat: 26.3796, lng: 80.4086, zoom: 16 },
    { name: "Lal Bangla", lat: 26.4212, lng: 80.3895, zoom: 17 },
    { name: "Mall Road", lat: 26.4773, lng: 80.3365, zoom: 17 },
    { name: "Parade", lat: 26.4645, lng: 80.3490, zoom: 17 },
    { name: "Gwaltoli", lat: 26.4844, lng: 80.3291, zoom: 17 },
    { name: "Sisamau", lat: 26.4698, lng: 80.3278, zoom: 17 },
    { name: "P-Road", lat: 26.4640, lng: 80.3370, zoom: 17 },
    { name: "Gumti No. 5", lat: 26.4690, lng: 80.3120, zoom: 17 },
    { name: "Fazalganj", lat: 26.4610, lng: 80.2980, zoom: 17 },
    { name: "Dada Nagar", lat: 26.4420, lng: 80.2780, zoom: 16 },
    { name: "Rawatpur", lat: 26.4850, lng: 80.2890, zoom: 17 },
    { name: "Chunni Ganj", lat: 26.4720, lng: 80.3490, zoom: 17 },
    { name: "Birhana Road", lat: 26.4625, lng: 80.3560, zoom: 17 },
    { name: "Anwarganj", lat: 26.4580, lng: 80.3420, zoom: 17 },
    { name: "Juhi", lat: 26.4380, lng: 80.3180, zoom: 16 },
    { name: "Yashoda Nagar", lat: 26.4180, lng: 80.3620, zoom: 16 },
    { name: "Shyam Nagar", lat: 26.4310, lng: 80.3710, zoom: 16 },
    { name: "Gujaini", lat: 26.4210, lng: 80.2680, zoom: 16 },
  ],
  Lucknow: [
    { name: "Hazratganj", lat: 26.8500, lng: 80.9490, zoom: 17 },
    { name: "Gomti Nagar", lat: 26.8520, lng: 80.9980, zoom: 16 },
    { name: "Alambagh", lat: 26.8040, lng: 80.9020, zoom: 16 },
    { name: "Indira Nagar", lat: 26.8820, lng: 80.9850, zoom: 16 },
    { name: "Chowk", lat: 26.8680, lng: 80.9050, zoom: 17 },
    { name: "Aminabad", lat: 26.8450, lng: 80.9250, zoom: 17 },
    { name: "Mahanagar", lat: 26.8750, lng: 80.9520, zoom: 16 },
    { name: "Charbagh", lat: 26.8320, lng: 80.9200, zoom: 17 },
  ],
  Varanasi: [
    { name: "Godowlia", lat: 25.3080, lng: 83.0060, zoom: 17 },
    { name: "Dashashwamedh Ghat", lat: 25.3060, lng: 83.0110, zoom: 17 },
    { name: "Assi Ghat", lat: 25.2890, lng: 83.0060, zoom: 17 },
    { name: "Lanka / BHU", lat: 25.2750, lng: 82.9980, zoom: 16 },
    { name: "Cantonment", lat: 25.3340, lng: 82.9810, zoom: 16 },
    { name: "Sigra", lat: 25.3190, lng: 82.9870, zoom: 17 },
  ],
  Prayagraj: [
    { name: "Civil Lines", lat: 25.4520, lng: 81.8340, zoom: 17 },
    { name: "Sangam Area", lat: 25.4280, lng: 81.8840, zoom: 16 },
    { name: "Katra", lat: 25.4610, lng: 81.8520, zoom: 17 },
    { name: "Naini", lat: 25.3950, lng: 81.8680, zoom: 16 },
    { name: "Allahpur", lat: 25.4460, lng: 81.8680, zoom: 17 },
  ],
  Agra: [
    { name: "Tajganj", lat: 27.1680, lng: 78.0420, zoom: 17 },
    { name: "Sanjay Place", lat: 27.2010, lng: 78.0050, zoom: 17 },
    { name: "Sikandra", lat: 27.2200, lng: 77.9510, zoom: 16 },
    { name: "Shahganj", lat: 27.1810, lng: 77.9780, zoom: 17 },
  ],
  Noida: [
    { name: "Sector 18 Market", lat: 28.5700, lng: 77.3210, zoom: 17 },
    { name: "Sector 62 IT Hub", lat: 28.6280, lng: 77.3650, zoom: 16 },
    { name: "Botanical Garden Area", lat: 28.5640, lng: 77.3340, zoom: 17 },
    { name: "Sector 137 Expressway", lat: 28.5080, lng: 77.4080, zoom: 16 },
  ],
  "New Delhi": [
    { name: "Connaught Place", lat: 28.6315, lng: 77.2167, zoom: 17 },
    { name: "Karol Bagh", lat: 28.6517, lng: 77.1906, zoom: 17 },
    { name: "Chandni Chowk", lat: 28.6506, lng: 77.2303, zoom: 17 },
    { name: "Lajpat Nagar", lat: 28.5677, lng: 77.2433, zoom: 17 },
    { name: "Hauz Khas", lat: 28.5494, lng: 77.2001, zoom: 17 },
  ],
  Mumbai: [
    { name: "Marine Drive / Colaba", lat: 18.9438, lng: 72.8232, zoom: 17 },
    { name: "Dadar", lat: 19.0178, lng: 72.8478, zoom: 17 },
    { name: "Bandra West", lat: 19.0596, lng: 72.8295, zoom: 17 },
    { name: "Andheri West", lat: 19.1136, lng: 72.8697, zoom: 16 },
    { name: "Juhu Beach Area", lat: 19.0988, lng: 72.8267, zoom: 17 },
    { name: "Kurla", lat: 19.0688, lng: 72.8856, zoom: 16 },
  ],
  Pune: [
    { name: "Kothrud", lat: 18.5074, lng: 73.8077, zoom: 17 },
    { name: "Shivaji Nagar", lat: 18.5314, lng: 73.8446, zoom: 17 },
    { name: "Hinjewadi IT Park", lat: 18.5912, lng: 73.7389, zoom: 16 },
    { name: "Viman Nagar", lat: 18.5679, lng: 73.9143, zoom: 16 },
  ],
  Bengaluru: [
    { name: "MG Road / Brigade", lat: 12.9756, lng: 77.6066, zoom: 17 },
    { name: "Koramangala", lat: 12.9352, lng: 77.6245, zoom: 17 },
    { name: "Indiranagar", lat: 12.9784, lng: 77.6408, zoom: 17 },
    { name: "Whitefield", lat: 12.9698, lng: 77.7500, zoom: 16 },
    { name: "HSR Layout", lat: 12.9121, lng: 77.6446, zoom: 16 },
  ],
  Chennai: [
    { name: "Marina Beach / Triplicane", lat: 13.0500, lng: 80.2824, zoom: 17 },
    { name: "T. Nagar", lat: 13.0418, lng: 80.2341, zoom: 17 },
    { name: "Adyar", lat: 13.0012, lng: 80.2565, zoom: 17 },
    { name: "Velachery", lat: 12.9759, lng: 80.2212, zoom: 16 },
    { name: "Mylapore", lat: 13.0368, lng: 80.2676, zoom: 17 },
  ],
  Kolkata: [
    { name: "Park Street", lat: 22.5510, lng: 88.3524, zoom: 17 },
    { name: "Howrah Bridge Area", lat: 22.5851, lng: 88.3468, zoom: 17 },
    { name: "Salt Lake Sector V", lat: 22.5726, lng: 88.4312, zoom: 16 },
    { name: "Ballygunge", lat: 22.5280, lng: 88.3655, zoom: 17 },
    { name: "New Town", lat: 22.5867, lng: 88.4754, zoom: 16 },
  ],
  Hyderabad: [
    { name: "Banjara Hills", lat: 17.4156, lng: 78.4350, zoom: 17 },
    { name: "Hitec City / Madhapur", lat: 17.4483, lng: 78.3750, zoom: 16 },
    { name: "Charminar Old City", lat: 17.3616, lng: 78.4747, zoom: 17 },
    { name: "Secunderabad", lat: 17.4399, lng: 78.4983, zoom: 16 },
  ],
  Patna: [
    { name: "Gandhi Maidan", lat: 25.6170, lng: 85.1440, zoom: 17 },
    { name: "Boring Road", lat: 25.6150, lng: 85.1180, zoom: 17 },
    { name: "Kankarbagh", lat: 25.5940, lng: 85.1530, zoom: 16 },
    { name: "Danapur", lat: 25.6320, lng: 85.0450, zoom: 16 },
  ],
};

export const CITY_COORDINATES: Record<string, { state: string; lat: number; lng: number }> = {
  Kanpur: { state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
  Lucknow: { state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  Varanasi: { state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739 },
  Prayagraj: { state: "Uttar Pradesh", lat: 25.4358, lng: 81.8463 },
  Agra: { state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081 },
  Noida: { state: "Uttar Pradesh", lat: 28.5355, lng: 77.3910 },
  "New Delhi": { state: "Delhi", lat: 28.6139, lng: 77.2090 },
  Mumbai: { state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  Pune: { state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  Bengaluru: { state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  Chennai: { state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  Kolkata: { state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  Hyderabad: { state: "Telangana", lat: 17.3850, lng: 78.4867 },
  Patna: { state: "Bihar", lat: 25.5941, lng: 85.1376 },
  Bhubaneswar: { state: "Odisha", lat: 20.2961, lng: 85.8245 },
  Puri: { state: "Odisha", lat: 19.8135, lng: 85.8312 },
  Cuttack: { state: "Odisha", lat: 20.4625, lng: 85.8828 },
  Jaipur: { state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  Ahmedabad: { state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  Surat: { state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  Kochi: { state: "Kerala", lat: 9.9312, lng: 76.2673 },
  Visakhapatnam: { state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  Guwahati: { state: "Assam", lat: 26.1445, lng: 91.7362 },
  Chandigarh: { state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  Bhopal: { state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  Indore: { state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
};

/**
 * Automatically detects the closest Indian City & State from latitude and longitude.
 */
export function detectNearestJurisdiction(
  lat: number,
  lng: number
): { state: string; city: string; distanceKm: number } {
  let closestCity = "Kanpur";
  let closestState = "Uttar Pradesh";
  let minDistance = Infinity;

  for (const [city, info] of Object.entries(CITY_COORDINATES)) {
    const dLat = ((info.lat - lat) * Math.PI) / 180;
    const dLon = ((info.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((info.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = 6371 * c; // in km

    if (dist < minDistance) {
      minDistance = dist;
      closestCity = city;
      closestState = info.state;
    }
  }

  return {
    city: closestCity,
    state: closestState,
    distanceKm: Math.round(minDistance),
  };
}

/**
 * Normalizes city/district names to combine variants (e.g. 'Kanpur Nagar' -> 'Kanpur').
 */
export function normalizeCityName(cityName?: string | null): string {
  if (!cityName) return "";
  const cleaned = cityName.trim();
  if (/^kanpur/i.test(cleaned)) return "Kanpur";
  if (/^lucknow/i.test(cleaned)) return "Lucknow";
  if (/^varanasi/i.test(cleaned) || /^banaras/i.test(cleaned) || /^kashi/i.test(cleaned)) return "Varanasi";
  if (/^prayagraj/i.test(cleaned) || /^allahabad/i.test(cleaned)) return "Prayagraj";
  if (/^delhi/i.test(cleaned)) return "New Delhi";
  if (/^mumbai/i.test(cleaned) || /^bombay/i.test(cleaned)) return "Mumbai";
  if (/^bengaluru/i.test(cleaned) || /^bangalore/i.test(cleaned)) return "Bengaluru";
  if (/^kolkata/i.test(cleaned) || /^calcutta/i.test(cleaned)) return "Kolkata";
  if (/^chennai/i.test(cleaned) || /^madras/i.test(cleaned)) return "Chennai";
  return cleaned.replace(/\s+(Nagar|District|Rural|Urban|Dehat|City)$/i, "").trim();
}
