const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 为 user_id=5 生成一个测试 token
const secret = process.env.JWT_SECRET || 'framene-dev-secret-key';
const token = jwt.sign({ userId: 5 }, secret, { expiresIn: '1h' });

console.log('Test token for user 5:', token);
