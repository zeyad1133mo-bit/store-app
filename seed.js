/* ==========================================================================
   seed.js — reset the store data and insert a clean demo catalogue
   --------------------------------------------------------------------------
   WARNING: this wipes every sale, product, and supplier, then inserts a
   fresh, varied catalogue with images. Run it once:

       node seed.js
   ========================================================================== */

require('dotenv').config();
const mysql = require('mysql2/promise');

const suppliers = [
    { SupplierName: 'TechSource', ContactNumber: '01011122233' },
    { SupplierName: 'StyleHouse', ContactNumber: '01022233344' },
    { SupplierName: 'HomeComfort', ContactNumber: '01033344455' },
    { SupplierName: 'FreshMart', ContactNumber: '01044455566' },
    { SupplierName: 'LuxeGoods', ContactNumber: '01055566677' }
];

/* supplierName is the key used to link each product below. */
const products = [
    { ProductName: 'iPhone 13 Pro', Price: 54999.00, StockQuantity: 12, Category: 'Electronics', supplierName: 'TechSource', ImageURL: 'images/iphone-13-pro.webp' },
    { ProductName: 'Apple AirPods Max', Price: 27999.00, StockQuantity: 8, Category: 'Electronics', supplierName: 'TechSource', ImageURL: 'images/airpods-max.webp' },
    { ProductName: 'MacBook Pro 14', Price: 99999.00, StockQuantity: 5, Category: 'Electronics', supplierName: 'TechSource', ImageURL: 'images/macbook-pro-14.webp' },
    { ProductName: 'Samsung Galaxy Tab S8+', Price: 29999.00, StockQuantity: 7, Category: 'Electronics', supplierName: 'TechSource', ImageURL: 'images/galaxy-tab-s8.webp' },
    { ProductName: 'Rolex Datejust', Price: 549999.00, StockQuantity: 2, Category: 'Watches', supplierName: 'LuxeGoods', ImageURL: 'images/rolex-datejust.webp' },
    { ProductName: 'Prada Women Bag', Price: 29999.00, StockQuantity: 4, Category: 'Bags', supplierName: 'LuxeGoods', ImageURL: 'images/prada-bag.webp' },
    { ProductName: 'Calvin Klein One 100ml', Price: 2499.00, StockQuantity: 15, Category: 'Fragrance', supplierName: 'LuxeGoods', ImageURL: 'images/ck-one.webp' },
    { ProductName: 'Calvin Klein Heel Shoes', Price: 3999.00, StockQuantity: 10, Category: 'Shoes', supplierName: 'StyleHouse', ImageURL: 'images/ck-heel-shoes.webp' },
    { ProductName: 'Nike Air Jordan 1', Price: 7499.00, StockQuantity: 9, Category: 'Shoes', supplierName: 'StyleHouse', ImageURL: 'images/air-jordan-1.webp' },
    { ProductName: 'Classic Sunglasses', Price: 1199.00, StockQuantity: 20, Category: 'Fashion', supplierName: 'StyleHouse', ImageURL: 'images/sunglasses.webp' },
    { ProductName: 'Blue & Black Check Shirt', Price: 1499.00, StockQuantity: 18, Category: 'Clothing', supplierName: 'StyleHouse', ImageURL: 'images/check-shirt.webp' },
    { ProductName: 'Annibale Colombo Bed', Price: 94999.00, StockQuantity: 3, Category: 'Furniture', supplierName: 'HomeComfort', ImageURL: 'images/colombo-bed.webp' },
    { ProductName: 'Wooden Table Lamp', Price: 2499.00, StockQuantity: 14, Category: 'Home', supplierName: 'HomeComfort', ImageURL: 'images/table-lamp.webp' },
    { ProductName: 'Boxed Blender', Price: 1999.00, StockQuantity: 11, Category: 'Kitchen', supplierName: 'HomeComfort', ImageURL: 'images/boxed-blender.webp' },
    { ProductName: 'Cooking Oil 1L', Price: 89.50, StockQuantity: 60, Category: 'Grocery', supplierName: 'FreshMart', ImageURL: 'images/cooking-oil.webp' },
    { ProductName: 'Fresh Apple 1kg', Price: 45.00, StockQuantity: 80, Category: 'Grocery', supplierName: 'FreshMart', ImageURL: 'images/apple.webp' }
];

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: Number(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || 'Store'
    });

    console.log('Wiping old demo data (sales, products, suppliers)...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE Sales');
    await connection.query('TRUNCATE TABLE Products');
    await connection.query('TRUNCATE TABLE Suppliers');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const supplierIds = {};
    for (const supplier of suppliers) {
        const [result] = await connection.query(
            'INSERT INTO Suppliers (SupplierName, ContactNumber) VALUES (?, ?)',
            [supplier.SupplierName, supplier.ContactNumber]
        );
        supplierIds[supplier.SupplierName] = result.insertId;
    }
    console.log(`Inserted ${suppliers.length} suppliers.`);

    for (const product of products) {
        await connection.query(
            `INSERT INTO Products
             (ProductName, Price, StockQuantity, Category, SupplierID, ImageURL)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                product.ProductName,
                product.Price,
                product.StockQuantity,
                product.Category,
                supplierIds[product.supplierName],
                product.ImageURL
            ]
        );
    }
    console.log(`Inserted ${products.length} products.`);

    await connection.end();
    console.log('Seed complete. Start the server with: npm start');
}

seed().catch((error) => {
    console.log('Seed failed:', error.message);
    process.exit(1);
});
