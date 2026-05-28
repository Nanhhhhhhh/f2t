import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load frontend environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TOKEN_FILE = path.resolve(__dirname, '../.api-tester-token.json');

// Helper to save/load auth token
const saveToken = (token: any) =>
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token));
const loadToken = () => {
  if (fs.existsSync(TOKEN_FILE)) {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
  }
  return null;
};

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token if available
const token = loadToken();
if (token && token.accessToken) {
  console.log(
    `🔑 Using token for: ${token.user?.email || 'authenticated user'}`
  );
  client.defaults.headers.common['Authorization'] =
    `Bearer ${token.accessToken}`;
}

const log = (label: string, data: any) => {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(data, null, 2));
};

async function testApi() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  console.log(`🚀 F2T API Tester | Target: ${API_URL}`);

  try {
    switch (command) {
      // --- AUTH ---
      case 'auth:login': {
        const email = args[1] || 'farm1@f2t.vn';
        const password = args[2] || 'SeedPass123!';
        console.log(`Logging in as ${email}...`);
        const res = await client.post('/auth/login', { email, password });
        saveToken(res.data.data);
        log('Login Success', res.data);
        break;
      }
      case 'auth:me': {
        const res = await client.get('/auth/me');
        log('My Profile', res.data);
        break;
      }
      case 'auth:logout': {
        if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
        console.log('Logged out (local token removed).');
        break;
      }

      // --- FARMS ---
      case 'farm:list': {
        const res = await client.get('/farms');
        log('Farms', res.data);
        break;
      }
      case 'farm:update-hours': {
        const id = args[1];
        if (!id) throw new Error('Farm ID required');
        const res = await client.put(`/farms/${id}/business-hours`, {
          businessHours: {
            monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
            tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
          },
        });
        log('Updated Hours', res.data);
        break;
      }
      case 'farm:analytics': {
        const id = args[1];
        if (!id) throw new Error('Farm ID required');
        const res = await client.get(`/farms/${id}/analytics`);
        log('Farm Analytics', res.data);
        break;
      }

      // --- PRODUCTS ---
      case 'prod:list': {
        const res = await client.get('/products');
        log('Products', res.data);
        break;
      }
      case 'prod:patch-stock': {
        const id = args[1];
        if (!id) throw new Error('Product ID required');
        const stock = parseInt(args[2] || '100');
        const res = await client.patch(`/products/${id}/stock`, {
          availableQuantity: stock,
        });
        log('Stock Updated', res.data);
        break;
      }

      // --- ORDERS ---
      case 'order:list': {
        const res = await client.get('/orders');
        log('Orders', res.data);
        break;
      }
      case 'order:update-status': {
        const id = args[1];
        if (!id) throw new Error('Order ID required');
        const status = args[2] || 'confirmed';
        const res = await client.post(`/orders/${id}/status`, {
          status,
          notes: 'Status updated via tester',
        });
        log('Order Status Updated', res.data);
        break;
      }
      case 'order:cancel': {
        const id = args[1];
        if (!id) throw new Error('Order ID required');
        const res = await client.post(`/orders/${id}/cancel`, {
          reason: 'Customer changed mind',
        });
        log('Order Cancelled', res.data);
        break;
      }

      // --- NOTIFICATIONS ---
      case 'notify:list': {
        const res = await client.get('/notifications');
        log('Notifications', res.data);
        break;
      }
      case 'notify:read-all': {
        const userId = args[1];
        if (!userId) throw new Error('User ID required');
        const res = await client.patch(
          `/notifications/user/${userId}/read-all`
        );
        log('Marked all as read', res.data);
        break;
      }
      case 'notify:prefs': {
        const userId = args[1];
        if (!userId) throw new Error('User ID required');
        const res = await client.get(`/notifications/preferences/${userId}`);
        log('Notification Prefs', res.data);
        break;
      }

      // --- POSTS ---
      case 'post:list': {
        const res = await client.get('/posts');
        log('Posts', res.data);
        break;
      }

      case 'help':
      default:
        console.log(`
Available Commands:
  --- Auth ---
  auth:login [email] [pass]  - Login and save token
  auth:me                    - Get current user profile
  auth:logout                - Clear saved token

  --- Farms ---
  farm:list                  - List all farms
  farm:update-hours [id]     - Update business hours
  farm:analytics [id]        - Get farm performance stats

  --- Products ---
  prod:list                  - List all products
  prod:patch-stock [id] [qty]- Update product stock level

  --- Orders ---
  order:list                 - List all orders
  order:update-status [id] [status] - Change order state
  order:cancel [id]          - Cancel an order

  --- Notifications ---
  notify:list                - Get your notifications
  notify:read-all [userId]   - Mark all as read
  notify:prefs [userId]      - Get user notification settings

  --- Posts ---
  post:list                  - List community posts
        `);
        break;
    }
  } catch (error: any) {
    if (error.response) {
      console.error(
        '❌ API Error:',
        error.response.status,
        error.response.data
      );
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testApi();
