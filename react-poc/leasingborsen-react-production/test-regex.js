const variantLine = /^(.+?)\s+(\d+)\s+hk$ < /dev/null | ^(.+?)\s+\d+\s*kW\s*\((\d+)\s+hk\)$/;

const testLines = [
  "R-Line Black Edition 1.5 TSI EVO ACT DSG7 150 hk",
  "Pro S 150 kW (204 hk)",
  "Pro 150 kW (204 hk)",
  "Pro Max 210 kW (286 hk)",
  "eHybrid R-Line 1.4 TSI DSG6 218 hk",
  "Elegance 1.5 TSI EVO ACT DSG7 150 hk"
];

console.log("Testing variant line regex:");
testLines.forEach((line, i) => {
  const match = line.match(variantLine);
  if (match) {
    const variant = match[1]?.trim() || match[3]?.trim() || 'Unknown';
    const horsepower = parseInt(match[2] || match[4] || '0');
    console.log(`${i+1}. ✅ "${line}" -> Variant: "${variant}", HP: ${horsepower}`);
  } else {
    console.log(`${i+1}. ❌ "${line}" -> NO MATCH`);
  }
});
