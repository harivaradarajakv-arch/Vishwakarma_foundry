const axios = require('axios');

async function testInquiry() {
    try {
        const response = await axios.post('http://localhost:5000/api/inquiries', {
            type: "technical",
            subject: "Technical Support Needed",
            message: "Requesting details on installation procedure.",
            contactInfo: {
                name: "Direct API Test",
                email: "apitest@foundry.com",
                phone: "9876543210"
            }
        });
        console.log("Success:", response.data);
    } catch (e) {
        console.error("Error Status:", e.response?.status);
        console.error("Error Data:", JSON.stringify(e.response?.data, null, 2));
    }
}

testInquiry();
