async function verify() {
  try {
    const API = 'http://localhost:3000/api';
    
    // 1. Login to get tokens
    let res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'consumer1@f2t.vn', password: 'SeedPass123!' })
    });
    let data = await res.json();
    const CONSUMER_TOKEN = data.data.accessToken;

    res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'farm1@f2t.vn', password: 'SeedPass123!' })
    });
    data = await res.json();
    const FARM_TOKEN = data.data.accessToken;
    const FARM_ID = data.data.farm.id;

    res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'farm2@f2t.vn', password: 'SeedPass123!' })
    });
    data = await res.json();
    const OTHER_FARM_TOKEN = data.data.accessToken;

    // Get a product for this farm
    res = await fetch(`${API}/products?farmId=${FARM_ID}`);
    data = await res.json();
    const PRODUCT_ID = data.data.items[0].id;

    console.log('Testing User Profile Image Update...');
    res = await fetch(`${API}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CONSUMER_TOKEN}` },
      body: JSON.stringify({ avatarUrl: 'https://cloudinary.com/test-avatar.jpg', firstName: 'Nguyễn' })
    });
    data = await res.json();
    console.log('Avatar URL:', data.data?.avatarUrl, 'FirstName:', data.data?.firstName);

    console.log('Testing Role SEC-015 regression...');
    res = await fetch(`${API}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CONSUMER_TOKEN}` },
      body: JSON.stringify({ role: 'farm' })
    });
    data = await res.json();
    console.log('Role:', data.data?.role);

    console.log('Testing Farm Image Update...');
    res = await fetch(`${API}/farms/${FARM_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FARM_TOKEN}` },
      body: JSON.stringify({ logoUrl: 'https://cloudinary.com/farm-logo.jpg' })
    });
    data = await res.json();
    console.log('Farm Logo URL:', data.data?.logoUrl);

    console.log('Testing Product Image Update...');
    res = await fetch(`${API}/products/${PRODUCT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FARM_TOKEN}` },
      body: JSON.stringify({ images: ['https://cloudinary.com/tomato1.jpg'] })
    });
    data = await res.json();
    console.log('Product Images:', data.data?.images);

    console.log('Testing Wrong Owner Farm Update...');
    res = await fetch(`${API}/farms/${FARM_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OTHER_FARM_TOKEN}` },
      body: JSON.stringify({ name: 'Hacked Farm' })
    });
    console.log('Wrong owner statusCode:', res.status);

  } catch (error) {
    console.error(error);
  }
}

verify();
