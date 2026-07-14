const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcome: (userName) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 2.5em;">Welcome to Vishwakarma Foundry Works!</h1>
        <p style="margin: 10px 0; font-size: 1.2em;">Your journey with premium agricultural machinery begins here.</p>
      </div>
      <div style="padding: 30px; background-color: #f8f9fa; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
        <p style="color: #666; line-height: 1.6;">Thank you for registering with Vishwakarma Foundry Works. We are excited to have you as part of our community of farmers and agricultural professionals.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">What's Next?</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>✓ Browse our premium agricultural machinery</li>
            <li>✓ Get personalized recommendations</li>
            <li>✓ Access exclusive member benefits</li>
            <li>✓ Connect with our expert team</li>
          </ul>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}/products" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            Explore Products
          </a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 30px; color: #999; font-size: 0.9em;">
        <p>Vishwakarma Foundry Works | Industrial Area, Sector 82, Ghaziabad 201009</p>
        <p>📞 +91 9415139283 | 📧 info@vishwakarmafoundry.com</p>
      </div>
    </div>
  `,

  inquiryReceived: (userName, inquiryType, subject) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 2.5em;">Inquiry Received!</h1>
        <p style="margin: 10px 0; font-size: 1.2em;">We've got your message and will respond soon.</p>
      </div>
      <div style="padding: 30px; background-color: #f8f9fa; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
        <p style="color: #666; line-height: 1.6;">Thank you for contacting Vishwakarma Foundry Works. We have received your inquiry and our team will get back to you shortly.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f5576c;">
          <h3 style="color: #333; margin-bottom: 10px;">Inquiry Details:</h3>
          <p style="color: #666; margin: 5px 0;"><strong>Type:</strong> ${inquiryType}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
        </div>
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #2d5a2d; margin: 0;"><strong>⏱️ Expected Response Time:</strong> Within 24 business hours</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}/contact" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            Track Your Inquiry
          </a>
        </div>
      </div>
    </div>
  `,

  orderConfirmation: (orderNumber, userName, items) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 2.5em;">Order Confirmed!</h1>
        <p style="margin: 10px 0; font-size: 1.2em;">Your order #${orderNumber} has been received</p>
      </div>
      <div style="padding: 30px; background-color: #f8f9fa; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h2>
        <p style="color: #666; line-height: 1.6;">Thank you for your order! We're excited to start manufacturing your premium agricultural machinery.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">Order Summary:</h3>
          ${items.map(item => `
            <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
              <p style="margin: 5px 0; color: #333; font-weight: bold;">${item.name}</p>
              <p style="margin: 5px 0; color: #666;">Quantity: ${item.quantity} | Price: ₹${item.price}</p>
            </div>
          `).join('')}
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #856404; margin: 0;"><strong>📋 Next Steps:</strong> We'll contact you within 24 hours to confirm manufacturing details.</p>
        </div>
      </div>
    </div>
  `,

  paymentConfirmation: (orderNumber, amount) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 2.5em;">Payment Successful!</h1>
        <p style="margin: 10px 0; font-size: 1.2em;">Your payment has been processed</p>
      </div>
      <div style="padding: 30px; background-color: #f8f9fa; border-radius: 10px; margin-top: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Payment Details:</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> #${orderNumber}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Amount Paid:</strong> ₹${amount}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #155724; margin: 0;"><strong>✅ Your order is now being processed!</strong></p>
        </div>
      </div>
    </div>
  `
};

module.exports = { sendEmail, emailTemplates };
