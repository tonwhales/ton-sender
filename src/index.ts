import { Address, Cell, TonClient } from 'ton';
import express from 'express';

const endpoints = [
    'https://ton-api.tonwhales.com/jsonRPC',
    'https://ton.korshakov.com/jsonRPC',
    'https://toncenter.com/api/v2/jsonRPC',
    'https://scalable-api.tonwhales.com/jsonRPC'
];

(async () => {
    
    //
    // Start web server
    //

    const app = express();
    app.get('/', (req, res) => {
        res.send('Welcome to server!')
    });
    await new Promise<void>((resolve) => app.listen(3000, resolve));
})();