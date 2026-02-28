import fetch from 'node-fetch';

const apiUrl = 'http://localhost:3000/api/create-booking';
const payload = {
    checkIn: "2026-05-15",
    checkOut: "2026-05-18",
    roomTypeId: "22cea29f-51e6-438c-848e-211a046a9e28", // Standard Room
    guestName: "Race Condition Tester",
    guestEmail: "race@example.com",
    guestPhone: "+1234567890"
};

async function fireBooking(id) {
    console.log(`[Req ${id}] Firing...`);
    const start = Date.now();
    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        const time = Date.now() - start;
        console.log(`[Req ${id}] Returned ${res.status} in ${time}ms - ${text.substring(0, 100)}`);

        let json;
        try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }

        return { status: res.status, data: json };
    } catch (err) {
        console.error(`[Req ${id}] Failed hard:`, err.message);
        return { status: 500, data: { error: err.message } };
    }
}

async function runConcurrencyTest() {
    console.log("🔥 Firing 3 simultaneous booking requests for the exact same room & dates...");

    // Promise.all fires them basically at the exact same millisecond
    const results = await Promise.all([
        fireBooking(1),
        fireBooking(2),
        fireBooking(3)
    ]);

    let successCount = 0;
    let conflictCount = 0;

    results.forEach((res, i) => {
        if (res.status === 200) successCount++;
        if (res.status === 409) conflictCount++;
    });

    console.log("\n--- Audit Results ---");
    console.log(`Successful Bookings (Expected: 1): ${successCount}`);
    console.log(`Rejected Conflicts (Expected: 2): ${conflictCount}`);

    process.exit(0);
}

runConcurrencyTest();
