import { TonClient } from 'ton';
import chalk from 'chalk';
import { format } from 'date-fns';
import express from 'express';

//
// API Endpoints
//

const endpoints = [
    'https://ton-api.tonwhales.com/jsonRPC',
    'https://ton.korshakov.com/jsonRPC',
    'https://toncenter.com/api/v2/jsonRPC',
    'https://scalable-api.tonwhales.com/jsonRPC'
];

//
// Clients
//

const clients = endpoints
    .map((endpoint) => new TonClient({ endpoint }));

function log(src: any) {
    console.log(chalk.gray(format(Date.now(), 'yyyy-MM-dd HH:mm:ss')), src);
}

function warn(src: any) {
    console.warn(chalk.gray(format(Date.now(), 'yyyy-MM-dd HH:mm:ss')), src);
}

//
// Operation
//

async function sendMessage(message: Buffer) {
    log('Received message to send');
    await new Promise<void>(async (resolve, reject) => {
        let fails = 0;
        for (let c of clients) {
            (async () => {
                try {
                    await c.sendFile(message);
                    log('Successfuly sent to ' + c.parameters.endpoint);
                    resolve(); // Resolve on first success
                } catch (e) {
                    warn(e);
                    if (++fails === clients.length) {
                        reject(e); // Reject when everything failed
                    }
                }
            })()
        }
    });
}

//
// Start server
//

(async () => {

    //
    // Start web server
    //
    log('Starting HTTP server...');
    const app = express();
    app.get('/', (req, res) => {
        res.send('Welcome to server!')
    });
    app.post('/send', express.json(), async (req, res) => {
        try {
            const body = req.body;
            if (typeof body.message !== 'string') {
                throw Error('Unable to find message field');
            }
            let message = Buffer.from(body.message, 'base64');
            await sendMessage(message);
            res.status(200).send({ ok: true });
        } catch (e) {
            warn('Invalid package');
            warn(e);
            res.status(500).send()
        }
    });
    await new Promise<void>((resolve) => app.listen(3000, resolve));
    log('Server ready');
})();