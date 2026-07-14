/**
 * The 58 wilayas of Algeria (code + Arabic name + approximate center),
 * used across property forms and as map-coordinate fallbacks.
 */
export type Wilaya = {
  code: string;
  name: string;
  lat: number;
  lng: number;
};

export const WILAYAS: Wilaya[] = [
  { code: "01", name: "أدرار", lat: 27.87, lng: -0.29 },
  { code: "02", name: "الشلف", lat: 36.165, lng: 1.334 },
  { code: "03", name: "الأغواط", lat: 33.8, lng: 2.865 },
  { code: "04", name: "أم البواقي", lat: 35.877, lng: 7.113 },
  { code: "05", name: "باتنة", lat: 35.556, lng: 6.174 },
  { code: "06", name: "بجاية", lat: 36.751, lng: 5.056 },
  { code: "07", name: "بسكرة", lat: 34.85, lng: 5.728 },
  { code: "08", name: "بشار", lat: 31.617, lng: -2.216 },
  { code: "09", name: "البليدة", lat: 36.47, lng: 2.829 },
  { code: "10", name: "البويرة", lat: 36.374, lng: 3.902 },
  { code: "11", name: "تمنراست", lat: 22.785, lng: 5.522 },
  { code: "12", name: "تبسة", lat: 35.404, lng: 8.124 },
  { code: "13", name: "تلمسان", lat: 34.878, lng: -1.315 },
  { code: "14", name: "تيارت", lat: 35.371, lng: 1.317 },
  { code: "15", name: "تيزي وزو", lat: 36.717, lng: 4.047 },
  { code: "16", name: "الجزائر", lat: 36.7538, lng: 3.0588 },
  { code: "17", name: "الجلفة", lat: 34.673, lng: 3.263 },
  { code: "18", name: "جيجل", lat: 36.82, lng: 5.766 },
  { code: "19", name: "سطيف", lat: 36.19, lng: 5.415 },
  { code: "20", name: "سعيدة", lat: 34.83, lng: 0.151 },
  { code: "21", name: "سكيكدة", lat: 36.879, lng: 6.906 },
  { code: "22", name: "سيدي بلعباس", lat: 35.189, lng: -0.63 },
  { code: "23", name: "عنابة", lat: 36.9, lng: 7.766 },
  { code: "24", name: "قالمة", lat: 36.462, lng: 7.426 },
  { code: "25", name: "قسنطينة", lat: 36.365, lng: 6.615 },
  { code: "26", name: "المدية", lat: 36.264, lng: 2.759 },
  { code: "27", name: "مستغانم", lat: 35.931, lng: 0.089 },
  { code: "28", name: "المسيلة", lat: 35.705, lng: 4.542 },
  { code: "29", name: "معسكر", lat: 35.396, lng: 0.14 },
  { code: "30", name: "ورقلة", lat: 31.949, lng: 5.325 },
  { code: "31", name: "وهران", lat: 35.699, lng: -0.634 },
  { code: "32", name: "البيض", lat: 33.68, lng: 1.019 },
  { code: "33", name: "إليزي", lat: 26.483, lng: 8.466 },
  { code: "34", name: "برج بوعريريج", lat: 36.073, lng: 4.763 },
  { code: "35", name: "بومرداس", lat: 36.766, lng: 3.477 },
  { code: "36", name: "الطارف", lat: 36.767, lng: 8.313 },
  { code: "37", name: "تندوف", lat: 27.674, lng: -8.147 },
  { code: "38", name: "تيسمسيلت", lat: 35.607, lng: 1.811 },
  { code: "39", name: "الوادي", lat: 33.368, lng: 6.851 },
  { code: "40", name: "خنشلة", lat: 35.435, lng: 7.143 },
  { code: "41", name: "سوق أهراس", lat: 36.286, lng: 7.951 },
  { code: "42", name: "تيبازة", lat: 36.589, lng: 2.448 },
  { code: "43", name: "ميلة", lat: 36.45, lng: 6.264 },
  { code: "44", name: "عين الدفلى", lat: 36.264, lng: 1.968 },
  { code: "45", name: "النعامة", lat: 33.267, lng: -0.313 },
  { code: "46", name: "عين تموشنت", lat: 35.298, lng: -1.14 },
  { code: "47", name: "غرداية", lat: 32.489, lng: 3.674 },
  { code: "48", name: "غليزان", lat: 35.737, lng: 0.556 },
  { code: "49", name: "تيميمون", lat: 29.263, lng: 0.241 },
  { code: "50", name: "برج باجي مختار", lat: 21.328, lng: 0.954 },
  { code: "51", name: "أولاد جلال", lat: 34.417, lng: 5.065 },
  { code: "52", name: "بني عباس", lat: 30.13, lng: -2.167 },
  { code: "53", name: "عين صالح", lat: 27.193, lng: 2.478 },
  { code: "54", name: "عين قزام", lat: 19.567, lng: 5.767 },
  { code: "55", name: "تقرت", lat: 33.105, lng: 6.058 },
  { code: "56", name: "جانت", lat: 24.554, lng: 9.484 },
  { code: "57", name: "المغير", lat: 33.954, lng: 5.921 },
  { code: "58", name: "المنيعة", lat: 30.583, lng: 2.883 },
];

/** Look up a wilaya center by its Arabic name. */
export function getWilayaCenter(
  name: string,
): { lat: number; lng: number } | null {
  const w = WILAYAS.find((x) => x.name === name);
  return w ? { lat: w.lat, lng: w.lng } : null;
}

/**
 * Resolve coordinates for a property: use its own lat/lng when set, otherwise
 * fall back to the center of its wilaya. Returns null if neither is available.
 */
export function resolveCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  wilaya: string,
): { lat: number; lng: number } | null {
  if (latitude != null && longitude != null) {
    return { lat: latitude, lng: longitude };
  }
  return getWilayaCenter(wilaya);
}
