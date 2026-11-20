/* ==========================================================================
   routes/products.js — every /products endpoint
   --------------------------------------------------------------------------
   The list endpoint joins the supplier name so the frontend can show
   "who supplies this" without a second request.
   ========================================================================== */

const express = require('express');
const {
    asyncHandler,
    HttpError,
    requireFields,
    cleanString,
    optionalString,
    toPositiveInt,
    toNonNegativeNumber,
    isForeignKeyError
} = require('../utils');

module.exports = function productsRoutes(pool) {
    const router = express.Router();

    /* ---------- create ---------- */
    router.post('/', asyncHandler(async (req, res) => {
        requireFields(req.body, ['ProductName', 'Price', 'StockQuantity']);

        const ProductName = cleanString(req.body.ProductName, 'ProductName', 100);
        const Price = toNonNegativeNumber(req.body.Price, 'Price');
        const StockQuantity = toPositiveInt(req.body.StockQuantity, 'StockQuantity');
        const SupplierID = req.body.SupplierID
            ? toPositiveInt(req.body.SupplierID, 'SupplierID', { min: 1 })
            : null;
        const Category = optionalString(req.body.Category, 'Category', 50);
        const ImageURL = optionalString(req.body.ImageURL, 'ImageURL', 255);

        try {
            const [result] = await pool.query(
                `INSERT INTO Products
                 (ProductName, Price, StockQuantity, SupplierID, Category, ImageURL)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [ProductName, Price, StockQuantity, SupplierID, Category, ImageURL]
            );

            res.status(201).json({
                message: 'Product created successfully',
                ProductID: result.insertId
            });
        } catch (error) {
            if (isForeignKeyError(error)) {
                throw new HttpError(400, 'SupplierID does not match any supplier');
            }
            throw error;
        }
    }));

    /* ---------- list ---------- */
    router.get('/', asyncHandler(async (req, res) => {
        const [rows] = await pool.query(
            `SELECT p.*, s.SupplierName
             FROM Products p
             LEFT JOIN Suppliers s ON p.SupplierID = s.SupplierID
             ORDER BY p.ProductID`
        );
        res.json(rows);
    }));

    /* ---------- read one ---------- */
    router.get('/:id', asyncHandler(async (req, res) => {
        const id = toPositiveInt(req.params.id, 'ProductID');
        const [rows] = await pool.query(
            `SELECT p.*, s.SupplierName
             FROM Products p
             LEFT JOIN Suppliers s ON p.SupplierID = s.SupplierID
             WHERE p.ProductID = ?`,
            [id]
        );

        if (rows.length === 0) {
            throw new HttpError(404, 'Product not found');
        }

        res.json(rows[0]);
    }));

    /* ---------- update ---------- */
    router.put('/:id', asyncHandler(async (req, res) => {
        const id = toPositiveInt(req.params.id, 'ProductID');
        requireFields(req.body, ['ProductName', 'Price', 'StockQuantity']);

        const ProductName = cleanString(req.body.ProductName, 'ProductName', 100);
        const Price = toNonNegativeNumber(req.body.Price, 'Price');
        const StockQuantity = toPositiveInt(req.body.StockQuantity, 'StockQuantity');
        const SupplierID = req.body.SupplierID
            ? toPositiveInt(req.body.SupplierID, 'SupplierID', { min: 1 })
            : null;
        const Category = optionalString(req.body.Category, 'Category', 50);
        const ImageURL = optionalString(req.body.ImageURL, 'ImageURL', 255);

        try {
            const [result] = await pool.query(
                `UPDATE Products
                 SET ProductName = ?, Price = ?, StockQuantity = ?,
                     SupplierID = ?, Category = ?, ImageURL = ?
                 WHERE ProductID = ?`,
                [ProductName, Price, StockQuantity, SupplierID, Category, ImageURL, id]
            );

            if (result.affectedRows === 0) {
                throw new HttpError(404, 'Product not found');
            }

            res.json({ message: 'Product updated successfully' });
        } catch (error) {
            if (isForeignKeyError(error)) {
                throw new HttpError(400, 'SupplierID does not match any supplier');
            }
            throw error;
        }
    }));

    /* ---------- delete ---------- */
    router.delete('/:id', asyncHandler(async (req, res) => {
        const id = toPositiveInt(req.params.id, 'ProductID');

        try {
            const [result] = await pool.query(
                'DELETE FROM Products WHERE ProductID = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                throw new HttpError(404, 'Product not found');
            }

            res.json({ message: 'Product deleted successfully' });
        } catch (error) {
            if (isForeignKeyError(error)) {
                throw new HttpError(400,
                    'Cannot delete this product because sales records still reference it');
            }
            throw error;
        }
    }));

    return router;
};
