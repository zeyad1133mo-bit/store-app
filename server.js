require('dotenv').config();

const express = require('express');
const cors = require('cors');
const initDb = require('./DB');

const app = express();

/* Allow the static frontend (Live Server) to call this API. */
app.use(cors());
app.use(express.json());

/* Serve the frontend too: http://localhost:3000 shows the store directly.
   (Dotfiles like .env are ignored by default — they return 404.) */
app.use(express.static(__dirname, { extensions: ['html'] }));

initDb()
    .then((pool) => {
        app.use('/suppliers', require('./routes/suppliers')(pool));
        app.use('/products', require('./routes/products')(pool));
        app.use('/sales', require('./routes/sales')(pool));

        /* Any unmatched route. */
        app.use((req, res) => {
            res.status(404).json({ message: 'Route not found' });
        });

        /* Central error handler: HttpError keeps its status,
           anything unexpected becomes a 500. */
        app.use((error, req, res, next) => {
            console.log(error);

            const status = error.status || 500;
            res.status(status).json({
                message: status === 500 ? 'Internal server error' : error.message
            });
        });

        const port = Number(process.env.PORT) || 3000;
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error) => {
        console.log('Failed to start:', error);
        process.exit(1);
    });

module.exports = app;
