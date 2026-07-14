# Vishwakarma Foundry Works - Backend API

A comprehensive backend API for the Vishwakarma Foundry Works agricultural machinery website.

## 🚀 Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (User, Admin, Manager)
- Email verification
- Password reset functionality
- Secure password hashing

### Product Management
- CRUD operations for products
- Image upload and optimization with Cloudinary
- Product categorization and search
- Inventory management
- Product reviews and ratings
- SEO optimization

### Order Management
- Complete order processing
- Multiple payment methods
- Order tracking and timeline
- Shipping and installation management
- Order cancellation and refunds

### Customer Support
- Inquiry management system
- Multi-level support tickets
- Automated email notifications
- File attachments for inquiries
- Response tracking

### Warranty Management
- Warranty registration
- Claim processing
- Service history tracking
- Extended warranty support
- Document management

### Payment Integration
- Stripe payment integration
- Multiple payment methods
- Secure payment processing
- Webhook handling
- Refund processing

### File Management
- Cloudinary integration for images
- Document upload support
- File optimization
- Multiple file formats

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### Products
- `GET /api/products` - Get all products
- `GET /api/products/featured` - Get featured products
- `GET /api/products/:slug` - Get product by slug
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders (Admin)
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order status (Admin)
- `POST /api/orders/:id/cancel` - Cancel order

### Inquiries
- `POST /api/inquiries` - Submit inquiry
- `GET /api/inquiries` - Get all inquiries (Admin)
- `GET /api/inquiries/:id` - Get inquiry by ID
- `POST /api/inquiries/:id/responses` - Add response (Admin)
- `POST /api/inquiries/:id/notes` - Add internal note (Admin)

### Warranty
- `POST /api/warranty/register` - Register warranty
- `GET /api/warranty` - Get user warranties
- `POST /api/warranty/:id/claim` - File warranty claim
- `GET /api/warranty/admin/all` - Get all warranties (Admin)

### Payments
- `POST /api/payments/create-payment-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/refund` - Process refund
- `POST /api/payments/webhook` - Stripe webhook

### Users
- `GET /api/users/profile` - Get user profile
- `GET /api/users` - Get all users (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `POST /api/users/change-password` - Change password

### Upload
- `POST /api/upload/images` - Upload images
- `POST /api/upload/documents` - Upload documents
- `POST /api/upload/product-gallery` - Upload product gallery
- `DELETE /api/upload/:publicId` - Delete file

## 🛠️ Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **Stripe** - Payment processing
- **Cloudinary** - Image storage
- **Nodemailer** - Email service
- **Multer** - File upload
- **Sharp** - Image processing
- **Bcrypt.js** - Password hashing

## 📦 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your configuration

4. Start MongoDB server

5. Run the application:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

6. Seed the database:
   ```bash
   npm run seed
   ```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vishwakarma_foundry
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FROM_EMAIL=noreply@vishwakarmafoundry.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## 📊 Database Schema

### User Model
- Personal information
- Authentication details
- Business information
- Preferences

### Product Model
- Product details
- Specifications
- Pricing
- Images
- Categories
- Reviews

### Order Model
- Order details
- Items
- Shipping information
- Payment details
- Timeline

### Inquiry Model
- Inquiry details
- Responses
- Attachments
- Status tracking

### Warranty Model
- Warranty registration
- Claims
- Service history
- Documents

## 🔐 Security Features

- JWT authentication
- Password hashing
- Rate limiting
- Input validation
- CORS configuration
- Helmet security headers
- File upload restrictions

## 📧 Email Templates

- Welcome emails
- Order confirmations
- Inquiry responses
- Warranty notifications
- Password reset emails

## 🧪 Testing

```bash
# Run tests
npm test
```

## 📝 API Documentation

API documentation is available at `/api/health` endpoint when the server is running.

## 🚀 Deployment

### Production Setup

1. Set environment variables for production
2. Build the application
3. Deploy to your preferred hosting platform
4. Configure reverse proxy (nginx)
5. Set up SSL certificate

### Docker Support

```bash
# Build Docker image
docker build -t vishwakarma-backend .

# Run container
docker run -p 5000:5000 vishwakarma-backend
```

## 📞 Support

For support and inquiries:
- Email: support@vishwakarmafoundry.com
- Phone: +91 9415139283
- Address: Industrial Area, Sector 82, Ghaziabad 201009, Uttar Pradesh, India

## 📄 License

This project is licensed under the MIT License.

---

© 2026 Vishwakarma Foundry Works. All rights reserved.
