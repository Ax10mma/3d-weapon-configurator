const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- ЛОГІКА ШЛЯХІВ ДЛЯ DOCKER ТА ЛОКАЛУ ---
// Якщо ми в Docker, файли можуть бути на рівень вище або в тій же папці
app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../3d_tuning.html'));
});

// --- ПІДКЛЮЧЕННЯ ДО БАЗИ ---
// Пріоритет: 1. Змінна з Docker (MONGO_URI) 2. Змінна з .env 3. Локальна база
const mongoURI = process.env.MONGO_URI || 'mongodb://db:27017/tuning_db';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Connected до:', mongoURI))
    .catch(err => console.error('❌ Помилка підключення:', err));

// --- СХЕМИ ---
const ItemSchema = new mongoose.Schema({
    id: String,
    name: String,
    price: Number,
    category: String
});

const OrderSchema = new mongoose.Schema({
    customer: { name: String, phone: String, email: String },
    weapon: String,
    items: [String],
    totalPrice: Number,
    status: { type: String, default: 'Нове' },
    createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', ItemSchema);
const Order = mongoose.model('Order', OrderSchema);

// --- API РУТИ ---
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (e) { res.status(500).send(e); }
});

app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.status(201).json({ success: true });
    } catch (e) { res.status(500).send(e); }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) { res.status(500).send(e); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});