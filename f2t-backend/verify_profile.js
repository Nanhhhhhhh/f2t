async function verify() {
  const API = 'http://localhost:3000/api';
  let res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farm1@f2t.vn', password: 'SeedPass123!' })
  });
  let data = await res.json();
  const FARM_TOKEN = data.data.accessToken;
  const FARM_ID = data.data.farm.id;

  res = await fetch(`${API}/farms/${FARM_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FARM_TOKEN}` },
    body: JSON.stringify({ logoUrl: 'https://cloudinary.com/farm-logo.jpg' })
  });
  data = await res.json();
  console.log('PUT Farm Response:', JSON.stringify(data, null, 2));

  res = await fetch(`${API}/products?farmId=${FARM_ID}`);
  data = await res.json();
  const PRODUCT_ID = data.data.items[0].id;

  res = await fetch(`${API}/products/${PRODUCT_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FARM_TOKEN}` },
    body: JSON.stringify({ images: ['https://cloudinary.com/tomato1.jpg'] })
  });
  data = await res.json();
  console.log('PUT Product Response:', JSON.stringify(data, null, 2));
}
verify();
