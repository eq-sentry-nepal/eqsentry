// Approximate centroids (lat, lon) for Nepal districts — used to match a
// subscriber's typed district to a location for distance-based alerting.
// Coordinates are ~0.1° accurate, which is fine for ~150 km alert radii.
export const DISTRICTS = {
  // Koshi
  taplejung:[27.35,87.67], panchthar:[27.20,87.80], ilam:[26.91,87.93], jhapa:[26.60,87.90],
  morang:[26.65,87.45], sunsari:[26.65,87.17], dhankuta:[26.98,87.34], terhathum:[27.13,87.55],
  sankhuwasabha:[27.60,87.30], bhojpur:[27.17,87.05], solukhumbu:[27.70,86.70], okhaldhunga:[27.32,86.50],
  khotang:[27.20,86.80], udayapur:[26.85,86.65],
  // Madhesh
  saptari:[26.60,86.75], siraha:[26.65,86.90], dhanusha:[26.79,85.95], janakpur:[26.73,85.92],
  mahottari:[26.90,85.80], sarlahi:[26.98,85.55], rautahat:[27.00,85.30], bara:[27.00,85.00],
  parsa:[27.00,84.87], birgunj:[27.00,84.87],
  // Bagmati
  kathmandu:[27.70,85.32], lalitpur:[27.66,85.32], patan:[27.66,85.32], bhaktapur:[27.67,85.43],
  kavre:[27.60,85.56], kavrepalanchok:[27.60,85.56], sindhupalchok:[27.80,85.70], dolakha:[27.67,86.17],
  ramechhap:[27.40,86.10], sindhuli:[27.20,85.97], makwanpur:[27.43,85.03], hetauda:[27.43,85.03],
  chitwan:[27.58,84.43], bharatpur:[27.68,84.43], nuwakot:[27.90,85.16], rasuwa:[28.10,85.30], dhading:[27.90,84.90],
  // Gandaki
  gorkha:[28.00,84.63], lamjung:[28.27,84.36], tanahun:[27.95,84.25], kaski:[28.21,83.99],
  pokhara:[28.21,83.99], syangja:[28.10,83.87], parbat:[28.23,83.70], baglung:[28.27,83.60],
  myagdi:[28.60,83.57], mustang:[28.80,83.80], manang:[28.66,84.02], nawalpur:[27.70,84.10],
  // Lumbini
  palpa:[27.87,83.55], rupandehi:[27.70,83.45], butwal:[27.70,83.45], kapilvastu:[27.55,83.05],
  parasi:[27.55,83.67], nawalparasi:[27.55,83.67], gulmi:[28.07,83.25], arghakhanchi:[27.90,83.00],
  pyuthan:[28.10,82.87], rolpa:[28.30,82.64], dang:[28.03,82.30], ghorahi:[28.03,82.30],
  banke:[28.05,81.62], nepalgunj:[28.05,81.62], bardiya:[28.30,81.43],
  // Karnali
  salyan:[28.35,82.16], surkhet:[28.60,81.63], birendranagar:[28.60,81.63], dailekh:[28.84,81.70],
  jajarkot:[28.70,82.20], rukum:[28.63,82.49], jumla:[29.28,82.18], kalikot:[29.15,81.60],
  mugu:[29.70,82.10], humla:[30.00,81.80], dolpa:[29.00,82.90],
  // Sudurpaschim
  kailali:[28.70,80.60], dhangadhi:[28.70,80.60], kanchanpur:[28.96,80.18], mahendranagar:[28.96,80.18],
  dadeldhura:[29.30,80.58], baitadi:[29.53,80.47], darchula:[29.85,80.55], bajhang:[29.54,81.20],
  bajura:[29.50,81.40], achham:[29.10,81.30], doti:[29.27,80.93]
};

export function normalize(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
}
export function findDistrict(name) {
  const n = normalize(name);
  if (!n) return null;
  if (DISTRICTS[n]) return { lat: DISTRICTS[n][0], lon: DISTRICTS[n][1] };
  for (const key of Object.keys(DISTRICTS)) {           // partial / contains match
    if (n.includes(key) || key.includes(n)) return { lat: DISTRICTS[key][0], lon: DISTRICTS[key][1] };
  }
  return null;
}
export function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
