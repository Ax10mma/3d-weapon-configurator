const mongoose = require('mongoose');
require('dotenv').config();

// Підключення (MONGO_URI беремо з .env)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Підключено до бази для заповнення..."))
    .catch(err => console.log("❌ Помилка:", err));

// Використовуємо ту саму схему, що і в основному сервері
const ItemSchema = new mongoose.Schema({
    id: String,
    name: String,
    price: Number,
    category: String
});

const Item = mongoose.model('Item', ItemSchema);

const items = [
    // Категорія: Оптика (Sights)
    { id: 'holo_scope-v1', name: 'Holographic Sight', price: 1200, category: 'sights' },
    { id: 'reflex_sight', name: 'Reflex Sight', price: 850, category: 'sights' },
    
    // Категорія: Дуло (Barrel)
    { id: 'flash_hider-v1', name: 'Flash Hider', price: 450, category: 'barrel' },
    { id: 'silencer-v1', name: 'Silencer', price: 1100, category: 'barrel' },
    
    // Категорія: Приклад (Stock)
    { id: 'stock_tactical-v1', name: 'Tactical Stock', price: 1500, category: 'stock' }
];

const seedDB = async () => {
    await Item.deleteMany({}); // Очистити стару базу (щоб не було дублікатів)
    await Item.insertMany(items);
    console.log("🚀 Дані успішно завантажені в MongoDB Atlas!");
    process.exit();
};

seedDB();