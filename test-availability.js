import dotenv from 'dotenv';
dotenv.config();

import { handler } from './netlify/functions/rooms-availability.js';

async function test() {
    const event = {
        httpMethod: 'GET',
        queryStringParameters: {
            checkIn: '2026-03-03',
            checkOut: '2026-03-04',
            guests: '1'
        }
    };
    const result = await handler(event, {});
    console.log(result);
}

test();
