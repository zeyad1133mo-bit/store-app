/* ==========================================================================
   routes/suppliers.js — every /suppliers endpoint
   ========================================================================== */

const express = require('express');
const {
    asyncHandler,
    HttpError,
    requireFields,
    cleanString,
    optionalString,
    toPositiveInt,
    isForeignKeyError
} = require('../utils');

module.exports = function suppliersRoutes(pool) {
    const router = express.Router();

    /* ---------- create ---------- */
    router.post('/', asyncHandler(async (req, res) => {
        requireFields(req.body, ['SupplierName']);

        const SupplierName = cleanString(req.body.SupplierName, 'SupplierName', 100);
        const ContactNumber = optionalString(req.body.ContactNumber, 'ContactNumber', 15);

        try {
            const [result] = await pool.query(
                `INSERT INTO Suppliers (SupplierName, ContactNumber)
                 VALUES (?, ?)`,
                [SupplierName, ContactNumber]
            );

            res.status(201).json({
                message: 'Supplier created successfully',
                SupplierID: result.insertId
            });
        } catch (error) {
            if (isForeignKeyError(error)) {
                throw new HttpError(400, 'Invalid supplier reference');
            }
            throw error;
        }
    }));

    /* ---------- list ---------- */
    router.get('/', asyncHandler(async (req, res) => {
        const [rows] = await pool.query('SELECT * FROM Suppliers ORDER BY SupplierID');
        res.json(rows);
    }));

    /* ---------- read one ---------- */
    router.get('/:id', asyncHandler(async (req, res) => {
        const id = toPositiveInt(req.params.id, 'SupplierID');
        const [rows] = await pool.query(
            'SELECT * FROM Suppliers WHERE SupplierID = ?',
            [id]
        );

        if (rows.length === 0) {
            throw new HttpError(404, 'Supplier not found');
        }

        res.json(rows[0]);
    }));

    /* ---------- update ---------- */
    router.put('/:id', asyncHandler(async (req, res) => {
        const id = toPositiveInt(req.params.id, 'SupplierID');
        requireFields(req.body, ['SupplierName']);

        const SupplierName = cleanString(req.body.SupplierName, 'SupplierName', 100);
        const ContactNumber = optionalString(req.body.ContactNumber, 'ContactNumber', 15);

        const [result] = await pool.query(
            `UPDATE Suppliers
             SET SupplierName = ?, ContactNumber = ?
             WHERE SupplierID = ?`,
            [SupplierName, ContactNumber, id]
        );

        if (result.affectedRows === 0) {
            throw new HttpError(404, 'Supplier not found');
        }

        res.json({ message: 'Supplier updated successfully' });
    }));

    /* ---------- delete ---------- */
    router.delete('/:id', asyncHandler(async (req, res) => {
        const id = toPositiveInt(req.params.id, 'SupplierID');

        try {
            const [result] = await pool.query(
                'DELETE FROM Suppliers WHERE SupplierID = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                throw new HttpError(404, 'Supplier not found');
            }

            res.json({ message: 'Supplier deleted successfully' });
        } catch (error) {
            if (isForeignKeyError(error)) {
                throw new HttpError(400,
                    'Cannot delete this supplier because products still reference it');
            }
            throw error;
        }
    }));

    return router;
};
