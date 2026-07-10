// Country centroids + alias matching used to pin jobs on the globe
// and filter listings by country/city.

export const COUNTRIES = [
  { n: "United States", a: ["united states", "usa", "u\\.s\\.", "us", "america(?!s)"], lat: 39.8, lon: -98.6 },
  { n: "Canada", a: ["canada"], lat: 56.1, lon: -106.3 },
  { n: "Mexico", a: ["mexico"], lat: 23.6, lon: -102.6 },
  { n: "Brazil", a: ["brazil", "brasil"], lat: -14.2, lon: -51.9 },
  { n: "Argentina", a: ["argentina"], lat: -38.4, lon: -63.6 },
  { n: "Colombia", a: ["colombia"], lat: 4.6, lon: -74.3 },
  { n: "Chile", a: ["chile"], lat: -35.7, lon: -71.5 },
  { n: "Peru", a: ["peru"], lat: -9.2, lon: -75.0 },
  { n: "United Kingdom", a: ["united kingdom", "uk", "great britain", "england", "scotland", "wales"], lat: 54.0, lon: -2.5 },
  { n: "Ireland", a: ["ireland"], lat: 53.4, lon: -8.2 },
  { n: "Germany", a: ["germany", "deutschland"], lat: 51.2, lon: 10.4 },
  { n: "France", a: ["france"], lat: 46.6, lon: 2.2 },
  { n: "Netherlands", a: ["netherlands", "holland"], lat: 52.1, lon: 5.3 },
  { n: "Belgium", a: ["belgium"], lat: 50.5, lon: 4.5 },
  { n: "Spain", a: ["spain"], lat: 40.5, lon: -3.7 },
  { n: "Portugal", a: ["portugal"], lat: 39.4, lon: -8.2 },
  { n: "Italy", a: ["italy"], lat: 41.9, lon: 12.6 },
  { n: "Switzerland", a: ["switzerland"], lat: 46.8, lon: 8.2 },
  { n: "Austria", a: ["austria"], lat: 47.5, lon: 14.6 },
  { n: "Poland", a: ["poland"], lat: 51.9, lon: 19.1 },
  { n: "Czechia", a: ["czech", "czechia"], lat: 49.8, lon: 15.5 },
  { n: "Slovakia", a: ["slovakia"], lat: 48.7, lon: 19.7 },
  { n: "Hungary", a: ["hungary"], lat: 47.2, lon: 19.5 },
  { n: "Romania", a: ["romania"], lat: 45.9, lon: 25.0 },
  { n: "Bulgaria", a: ["bulgaria"], lat: 42.7, lon: 25.5 },
  { n: "Greece", a: ["greece"], lat: 39.1, lon: 21.8 },
  { n: "Croatia", a: ["croatia"], lat: 45.1, lon: 15.2 },
  { n: "Serbia", a: ["serbia"], lat: 44.0, lon: 21.0 },
  { n: "Slovenia", a: ["slovenia"], lat: 46.2, lon: 15.0 },
  { n: "Sweden", a: ["sweden"], lat: 60.1, lon: 18.6 },
  { n: "Norway", a: ["norway"], lat: 60.5, lon: 8.5 },
  { n: "Denmark", a: ["denmark"], lat: 56.3, lon: 9.5 },
  { n: "Finland", a: ["finland"], lat: 61.9, lon: 25.7 },
  { n: "Estonia", a: ["estonia"], lat: 58.6, lon: 25.0 },
  { n: "Latvia", a: ["latvia"], lat: 56.9, lon: 24.6 },
  { n: "Lithuania", a: ["lithuania"], lat: 55.2, lon: 23.9 },
  { n: "Ukraine", a: ["ukraine"], lat: 48.4, lon: 31.2 },
  { n: "Turkey", a: ["turkey", "türkiye"], lat: 39.0, lon: 35.2 },
  { n: "Israel", a: ["israel"], lat: 31.0, lon: 34.9 },
  { n: "United Arab Emirates", a: ["united arab emirates", "uae", "dubai"], lat: 23.4, lon: 53.8 },
  { n: "Saudi Arabia", a: ["saudi"], lat: 23.9, lon: 45.1 },
  { n: "Egypt", a: ["egypt"], lat: 26.8, lon: 30.8 },
  { n: "Nigeria", a: ["nigeria"], lat: 9.1, lon: 8.7 },
  { n: "Kenya", a: ["kenya"], lat: -0.02, lon: 37.9 },
  { n: "South Africa", a: ["south africa"], lat: -30.6, lon: 22.9 },
  { n: "India", a: ["india"], lat: 20.6, lon: 79.0 },
  { n: "Pakistan", a: ["pakistan"], lat: 30.4, lon: 69.3 },
  { n: "Bangladesh", a: ["bangladesh"], lat: 23.7, lon: 90.4 },
  { n: "Sri Lanka", a: ["sri lanka"], lat: 7.9, lon: 80.8 },
  { n: "China", a: ["china"], lat: 35.9, lon: 104.2 },
  { n: "Japan", a: ["japan"], lat: 36.2, lon: 138.3 },
  { n: "South Korea", a: ["south korea", "korea"], lat: 35.9, lon: 127.8 },
  { n: "Singapore", a: ["singapore"], lat: 1.35, lon: 103.8 },
  { n: "Malaysia", a: ["malaysia"], lat: 4.2, lon: 101.9 },
  { n: "Thailand", a: ["thailand"], lat: 15.9, lon: 100.9 },
  { n: "Vietnam", a: ["vietnam"], lat: 14.1, lon: 108.3 },
  { n: "Philippines", a: ["philippines"], lat: 12.9, lon: 121.8 },
  { n: "Indonesia", a: ["indonesia"], lat: -0.8, lon: 113.9 },
  { n: "Australia", a: ["australia"], lat: -25.3, lon: 133.8 },
  { n: "New Zealand", a: ["new zealand"], lat: -40.9, lon: 174.9 },
  { n: "Russia", a: ["russia"], lat: 61.5, lon: 105.3 },
];

// Common cities that appear in listings without a country name.
const CITY_TO_COUNTRY = {
  "new york": "United States", "san francisco": "United States", "los angeles": "United States",
  "chicago": "United States", "boston": "United States", "seattle": "United States",
  "austin": "United States", "denver": "United States", "atlanta": "United States",
  "london": "United Kingdom", "manchester": "United Kingdom", "edinburgh": "United Kingdom",
  "dublin": "Ireland", "paris": "France", "lyon": "France",
  "amsterdam": "Netherlands", "rotterdam": "Netherlands", "utrecht": "Netherlands",
  "brussels": "Belgium", "madrid": "Spain", "barcelona": "Spain",
  "lisbon": "Portugal", "porto": "Portugal", "milan": "Italy", "rome": "Italy",
  "zurich": "Switzerland", "zürich": "Switzerland", "geneva": "Switzerland", "basel": "Switzerland",
  "vienna": "Austria", "wien": "Austria", "warsaw": "Poland", "krakow": "Poland",
  "prague": "Czechia", "budapest": "Hungary", "bucharest": "Romania",
  "stockholm": "Sweden", "gothenburg": "Sweden", "oslo": "Norway",
  "copenhagen": "Denmark", "helsinki": "Finland", "tallinn": "Estonia",
  "toronto": "Canada", "vancouver": "Canada", "montreal": "Canada",
  "sydney": "Australia", "melbourne": "Australia", "auckland": "New Zealand",
  "tokyo": "Japan", "seoul": "South Korea", "bangalore": "India", "bengaluru": "India",
  "mumbai": "India", "delhi": "India", "hyderabad": "India", "pune": "India",
  "tel aviv": "Israel", "istanbul": "Turkey", "cairo": "Egypt",
  "lagos": "Nigeria", "nairobi": "Kenya", "cape town": "South Africa",
  "são paulo": "Brazil", "sao paulo": "Brazil", "mexico city": "Mexico",
  "buenos aires": "Argentina", "bogota": "Colombia", "bogotá": "Colombia",
  "berlin": "Germany", "hamburg": "Germany", "munich": "Germany", "münchen": "Germany",
  "frankfurt": "Germany", "cologne": "Germany", "köln": "Germany", "stuttgart": "Germany",
  "düsseldorf": "Germany", "leipzig": "Germany", "dresden": "Germany",
  "hannover": "Germany", "nürnberg": "Germany", "nuremberg": "Germany",
  "bremen": "Germany", "essen": "Germany", "dortmund": "Germany",
};

const countryRegexes = COUNTRIES.map((c) => ({
  n: c.n,
  re: new RegExp("\\b(" + c.a.join("|") + ")\\b", "i"),
}));

const WORLDWIDE_RE = /worldwide|anywhere|global|remote|emea|apac|latam|americas|europe(?!an)|international/i;

// Returns { countries: [names], worldwide: bool }
export function matchLocation(location, source) {
  const loc = (location || "").toLowerCase();
  const found = new Set();
  for (const { n, re } of countryRegexes) {
    if (re.test(loc)) found.add(n);
  }
  if (!found.size) {
    for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
      if (loc.includes(city)) { found.add(country); break; }
    }
  }
  // Arbeitnow is a German job board; unlabelled locations are German towns.
  if (!found.size && source === "Arbeitnow" && loc && !WORLDWIDE_RE.test(loc)) {
    found.add("Germany");
  }
  return {
    countries: [...found],
    worldwide: found.size === 0,
  };
}
