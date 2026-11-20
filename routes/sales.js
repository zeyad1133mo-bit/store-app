/* ==========================================================================
   routes/sales.js — every /sales endpoint
   --------------------------------------------------------------------------
   Recording a sale runs inside ONE transaction:
     1. Lock the product row (FOR UPDATE).
     2. Check there is enough stock.
     3. Insert the sale.
     4. Decrease the product stock.
   If any step fails, the whole transaction rolls back, so stock and sales
   can never disagree with each other.
   ========================================================================== */

const express = require('express');
const { asyncHandler, HttpError, requireFields, toPositiveInt } = require('../utils');

module.exports = function salesRoutes(pool) {
    const router = express.Router();

    /* ---------- checkout: buy the whole cart in ONE transaction ----------
       Body: { items: [{ ProductID, QuantitySold }, ...] }
       Every item is validated first; if any product is missing or short on
       stock, the whole checkout fails and nothing changes. */
    router.post('/checkout', asyncHandler(async (req, res) => {
        const items = req.body && req.body.items;

        if (!Array.isArray(items) || items.length === 0) {
            throw new HttpError(400, 'Cart is empty: send items: [{ ProductID, QuantitySold }]');
        }

        /* Validate and merge duplicate lines for the same product. */
        const wanted = new Map();
        for (const item of items) {
            requireFields(item, ['ProductID', 'QuantitySold']);
            const ProductID = toPositiveInt(item.ProductID, 'ProductID', { min: 1 });
            const QuantitySold = toPositiveInt(item.QuantitySold, 'QuantitySold', { min: 1 });
            wanted.set(ProductID, (wanted.get(ProductID) || 0) + QuantitySold);
        }

        const SaleDate = req.body.SaleDate
            ? String(req.body.SaleDate)
            : new Date().toISOString().slice(0, 10);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(SaleDate)) {
            throw new HttpError(400, 'SaleDate must be in YYYY-MM-DD format');
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const lines = [];
            let orderTotal = 0;

            /* Lock every product row we are about to sell. */
            for (const [ProductID, QuantitySold] of wanted) {
                const [products] = await connection.query(
                    `SELECT Price, StockQuantity, ProductName
                     FROM Products
                     WHERE ProductID = ?
                     FOR UPDATE`,
                    [ProductID]
                );

                if (products.length === 0) {
                    throw new HttpError(404, `Product ${ProductID} not found`);
                }

                const product = products[0];

                if (product.StockQuantity < QuantitySold) {
                    throw new HttpError(
                        400,
                        `Not enough stock for "${product.ProductName}": only ${product.StockQuantity} left`
                    );
                }

                const lineTotal = Number(product.Price) * QuantitySold;
                orderTotal += lineTotal;

                const [result] = await connection.query(
                    `INSERT INTO Sales (ProductID, QuantitySold, SaleDate, TotalAmount)
                     VALUES (?, ?, ?, ?)`,
                    [ProductID, QuantitySold, SaleDate, lineTotal]
                );

                await connection.query(
                    `UPDATE Products
                     SET StockQuantity = StockQuantity - ?
                     WHERE ProductID = ?`,
                    [QuantitySold, ProductID]
                );

                lines.push({
                    SaleID: result.insertId,
                    ProductID,
                    ProductName: product.ProductName,
                    QuantitySold,
                    LineTotal: lineTotal
                });
            }

            await connection.commit();

            res.status(201).json({
                message: 'Checkout completed successfully',
                OrderTotal: orderTotal,
                Lines: lines
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }));

    /* ---------- record a single sale ---------- */
    router.post('/', asyncHandler(async (req, res) => {
        requireFields(req.body, ['ProductID', 'QuantitySold']);

        const ProductID = toPositiveInt(req.body.ProductID, 'ProductID', { min: 1 });
        const QuantitySold = toPositiveInt(req.body.QuantitySold, 'QuantitySold', { min: 1 });

        /* Default to today when no date was sent. */
        const SaleDate = req.body.SaleDate
            ? String(req.body.SaleDate)
            : new Date().toISOString().slice(0, 10);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(SaleDate)) {
            throw new HttpError(400, 'SaleDate must be in YYYY-MM-DD format');
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            /* Lock the row so two simultaneous sales cannot oversell. */
            const [products] = await connection.query(
                `SELECT Price, StockQuantity
                 FROM Products
                 WHERE ProductID = ?
                 FOR UPDATE`,
                [ProductID]
            );

            if (products.length === 0) {
                throw new HttpError(404, 'Product not found');
            }

            const product = products[0];

            if (product.StockQuantity < QuantitySold) {
                throw new HttpError(
                    400,
                    `Not enough stock: only ${product.StockQuantity} left`
                );
            }

            const totalAmount = Number(product.Price) * QuantitySold;

            const [result] = await connection.query(
                `INSERT INTO Sales (ProductID, QuantitySold, SaleDate, TotalAmount)
                 VALUES (?, ?, ?, ?)`,
                [ProductID, QuantitySold, SaleDate, totalAmount]
            );

            await connection.query(
                `UPDATE Products
                 SET StockQuantity = StockQuantity - ?
                 WHERE ProductID = ?`,
                [QuantitySold, ProductID]
            );

            await connection.commit();

            res.status(201).json({
                message: 'Sale recorded successfully',
                SaleID: result.insertId,
                TotalAmount: totalAmount
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }));

    /* ---------- list all sales (with product names) ---------- */
    router.get('/', asyncHandler(async (req, res) => {
        const [rows] = await pool.query(
            `SELECT s.SaleID, s.ProductID, p.ProductName,
                    s.QuantitySold, s.SaleDate, s.TotalAmount
             FROM Sales s
             JOIN Products p ON s.ProductID = p.ProductID
             ORDER BY s.SaleDate DESC, s.SaleID DESC`
        );
        res.json(rows);
    }));

    /* ---------- sales for one product ---------- */
    router.get('/product/:productId', asyncHandler(async (req, res) => {
        const productId = toPositiveInt(req.params.productId, 'ProductID');

        const [rows] = await pool.query(
            `SELECT s.SaleID, s.ProductID, p.ProductName,
                    s.QuantitySold, s.SaleDate, s.TotalAmount
             FROM Sales s
             JOIN Products p ON s.ProductID = p.ProductID
             WHERE s.ProductID = ?
             ORDER BY s.SaleDate DESC, s.SaleID DESC`,
            [productId]
        );

        res.json(rows);
    }));

    return router;
};
