// utils/distance.js
// Tính khoảng cách (km) giữa 2 toạ độ (vĩ độ/kinh độ) theo công thức Haversine.
// Dùng để giả lập "khoảng cách từ nhà đến phòng khám" như yêu cầu đề bài.
function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some(v => v === null || v === undefined || isNaN(v))) return null;
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371; // bán kính trái đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

module.exports = { haversineKm };
