PHASE 1 — Project Setup
🖥️ Tech Stack

Frontend: React + Redux Toolkit + TailwindCSS

Backend: Node.js + Express.js + MongoDB (Mongoose)

Auth: JWT-based authentication

Payment: Stripe (you already have Stripe integration, which is fine)

Email Notification :Sendgrid 

Deployment:

Frontend → Netlify

Backend → Render

⚙️ PHASE 2 — Backend (Express + MongoDB)
1️⃣ User Authentication

APIs:

POST /api/v1/auth/register → Register buyer/seller

// after Register check email spam for welcome message

POST /api/v1/auth/login → Login

POST /api/v1/auth/forgot-password

POST /api/v1/auth/reset-password

GET /api/v1/auth/me → Get current user info

PUT /api/v1/auth/update-profile

Features:

Role-based middleware: buyer vs seller

JWT token stored in HTTP-only cookie or localStorage

Bcrypt for password hashing

2️⃣ Product Management

APIs:

POST /api/v1/products (Seller only)

GET /api/v1/products (Everyone)

GET /api/v1/products/:id

PUT /api/v1/products/:id (Seller only)

DELETE /api/v1/products/:id (Seller only)

Optional: Filtering by category, type, price range, search query

3️⃣ Cart Management

APIs:

POST /api/v1/cart/add/:productId

PUT /api/v1/cart/update/:productId

DELETE /api/v1/cart/remove/:productId

DELETE /api/v1/cart/clear

GET /api/v1/cart

4️⃣ Orders

APIs:

POST /api/v1/orders/create

GET /api/v1/orders/my (Buyer)

GET /api/v1/orders/seller (Seller)

PUT /api/v1/orders/status/:id (Seller updates delivery status)


5️⃣ Reviews

APIs:

POST /api/v1/reviews/:productId

GET /api/v1/reviews/:productId

6️⃣ Wishlists

APIs:

POST /api/v1/wishlist/add/:productId

DELETE /api/v1/wishlist/remove/:productId

GET /api/v1/wishlist

7️⃣ Payment Integration

Use  Stripe.

Backend creates order → returns payment link/session.

After payment success, order status updates.