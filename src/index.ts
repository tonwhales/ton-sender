import { TonClient } from 'ton';
import chalk from 'chalk';
import { format } from 'date-fns';
import express from 'express';
import { createBackoff } from 'teslabot';

//
// API Endpoints
//

const endpoints = [
    'https://ton-api.tonwhales.com/jsonRPC',
    'https://node-1.servers.tonwhales.com/jsonRPC',
    'https://node-2.servers.tonwhales.com/jsonRPC',
    // 'https://ton.korshakov.com/jsonRPC',
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

const backoff = createBackoff({ onError: (e) => warn(e) });

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
                    let attempt = 0;
                    backoff(async () => {
                        attempt++;
                        if (attempt > 50) {
                            warn('Ignored due too many errors');
                            return;
                        }
                        await c.sendFile(message);
                        log('Successfuly sent to ' + c.parameters.endpoint);
                    });
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
    let port = 3000;
    if (process.env.PORT) {
        port = parseInt(process.env.PORT, 10);
    }
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
    await new Promise<void>((resolve) => app.listen(port, resolve));
    log('Server ready on ' + port);
})();