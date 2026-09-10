# P09 — Real Estate Property Listing & Enquiry Portal

A production-style, beginner-friendly **Real Estate Property Listing & Enquiry Portal** built with **Node.js, Express.js, MongoDB (Mongoose), and RESTful APIs**, adhering to strict academic project standards, role-based access control (RBAC), database indexing, business rule validation state machines, and MongoDB aggregations.

---

## 1. Project Overview

The **Real Estate Property Listing & Enquiry Portal** facilitates property discovery, direct buyer-agent communication, and strict administrative moderation:
* **Buyers / Tenants**: Discover verified properties, filter across locations, price, and specs, save listings to favourites, submit enquiries, and review agents.
* **Agents**: List properties (starts in `PENDING` review state), manage inbound buyer leads, and track deals.
* **Admins**: Review and audit listing submissions (`VERIFY` or `REJECT` with reason), moderate platform users, and review business analytics via MongoDB aggregations.

---

## 2. Key Features by Role

### 👤 Buyer / Tenant
* **Search & Browse**: Browse verified property listings with multi-attribute filtering (city, locality, property type, buy/rent, max price, BHK).
* **Saved Properties (Favourites)**: Bookmark listings with instant heart toggle. Prevents duplicate saves via unique database compound indexes.
* **Direct Enquiries**: Send enquiries directly to listing agents. Track status updates (`NEW`, `CONTACTED`, `APPROVED`, `REJECTED`, `CLOSED`) and agent remarks.
* **Agent Reviews**: Rate and review listing agents on a 1–5 star scale.

### 🏢 Real Estate Agent
* **Property Portfolio**: Create, edit, and manage property listings with full specifications, images, and descriptions.
* **Automatic Verification Workflow**: Newly created or modified properties start as `PENDING` review and are published upon Admin approval.
* **Property Status Tracking**: Transition listings between `AVAILABLE`, `UNDER_NEGOTIATION`, `SOLD`, and `RENTED`.
* **Lead Pipeline**: View all inbound buyer enquiries for owned listings and progress leads through state machine stages with remarks.

### 🛡️ Platform Admin
* **Listing Verification**: Audit pending submissions and choose to either verify (publish) or reject (specifying mandatory rejection reason).
* **User Management**: View all platform users (Buyers, Agents, Admins) and inspect agency affiliations.
* **MongoDB Aggregations & Analytics**:
  * **Summary Totals**: Platform metrics (users, listings, verification breakdown, pipeline count).
  * **Top Most-Enquired Properties**: Aggregation pipeline identifying highest-demand listings.
  * **Agent Performance Leaderboard**: Aggregation computing listings count, closed transactions, leads generated, and average rating.

---

## 3. Architecture & Tech Stack

```
               ┌──────────────────────────────────────────────┐
               │    Frontend Browser / Postman Client         │
               │   (Bootstrap 5 + Modular Vanilla JavaScript) │
               └──────────────────────┬───────────────────────┘
                                      │ HTTP / REST JSON
                                      ▼
               ┌──────────────────────────────────────────────┐
               │         Express.js Web Application           │
               │   (CORS, Helmet, Morgan, Body Parsers)       │
               └──────┬───────────────┬───────────────────────┘
                      │               │
      JWT & RBAC Auth │               │ Request Validation
     (middleware/auth)│               │ (express-validator)
                      ▼               ▼
               ┌──────────────────────────────────────────────┐
               │            API Controllers                   │
               │   (Auth, Property, Favourite, Enquiry, etc.) │
               └──────────────────────┬───────────────────────┘
                                      │
                         Centralized Error Handling
                         (middleware/errorHandler)
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │          Mongoose ODM & Models               │
               │ (User, Property, Enquiry, Favourite, Rating) │
               └──────────────────────┬───────────────────────┘
                                      │
                                      ▼
               ┌──────────────────────────────────────────────┐
               │    MongoDB Database / MongoMemoryServer      │
               │  (Compound Indexes, Aggregations, Pipelines) │
               └──────────────────────────────────────────────┘
```

* **Runtime**: Node.js (v18+)
* **Framework**: Express.js
* **Database**: MongoDB via Mongoose ODM
* **In-Memory Fallback**: `mongodb-memory-server` ensures the application runs immediately without requiring a local or cloud MongoDB setup.
* **Authentication**: JSON Web Tokens (`jsonwebtoken`) with `Bearer` header.
* **Password Hashing**: `bcryptjs` with salt factor 10.
* **Input Validation**: `express-validator` with centralized error formatting.
* **Testing**: Automated integration test runner covering all 13 modules.

---

## 4. Directory Structure

```
p09-real-estate-portal/
├── config/
│   └── db.js                       # Database connection with MongoMemoryServer fallback
├── controllers/
│   ├── adminController.js          # Admin moderation & user management
│   ├── agentController.js          # Agent profile, listings, and rating metrics
│   ├── authController.js           # Registration, JWT login, and profile lookup
│   ├── enquiryController.js        # Direct buyer enquiries & agent lead pipeline
│   ├── favouriteController.js      # Buyer saved listings & wishlist
│   ├── propertyController.js       # Property CRUD, search, and status tracking
│   └── reportController.js         # MongoDB aggregation analytics pipelines
├── middleware/
│   ├── auth.js                     # JWT verification & role-based access control (RBAC)
│   ├── errorHandler.js             # Centralized error formatting (CastError, Duplicate, etc.)
│   ├── notFound.js                 # 404 handler for undefined API routes
│   └── validate.js                 # express-validator middleware wrapper
├── models/
│   ├── Enquiry.js                  # Enquiry schema with status transition index
│   ├── Favourite.js                # Saved favourite schema with compound unique index
│   ├── Property.js                 # Property schema with verification & search indexes
│   ├── Rating.js                   # Agent ratings schema with unique (agentId, buyerId) index
│   └── User.js                     # User schema (roles: BUYER, AGENT, ADMIN)
├── public/                         # Clean, responsive Bootstrap frontend
│   ├── css/
│   │   └── style.css               # Custom theme styles & card layout
│   ├── js/
│   │   └── app.js                  # Frontend controller & REST API client
│   └── index.html                  # Single-page interface with Demo Role switcher
├── routes/
│   ├── adminRoutes.js              # /api/admin
│   ├── agentRoutes.js              # /api/agents
│   ├── authRoutes.js               # /api/auth
│   ├── enquiryRoutes.js            # /api/enquiries
│   ├── favouriteRoutes.js          # /api/favourites
│   ├── propertyRoutes.js           # /api/properties
│   └── reportRoutes.js             # /api/admin/reports
├── tests/
│   └── run-tests.js                # 26 automated integration tests
├── utils/
│   ├── AppError.js                 # Custom operational error class
│   ├── generateToken.js            # Signed JWT token generator
│   └── pagination.js               # Pagination calculation helpers
├── Postman/
│   └── Real-Estate-Portal.postman_collection.json # Complete API collection
├── app.js                          # Express application configuration & route mounting
├── server.js                       # Application entry point
├── seed.js                         # Database seeder with realistic test data
├── .env.example                    # Sample environment variables
└── package.json                    # Project metadata and dependencies
```

---

## 5. Getting Started & Installation

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Step 3: Seed Test Data
Populate the database with demo users, verified properties, pending properties, leads, and reviews:
```bash
npm run seed
```

### Step 4: Start the Server
```bash
npm run dev
# or: npm start
```
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **REST API Base URL**: `http://localhost:3000/api`

---

## 6. Pre-Configured Demo Credentials

The database seeder provisions realistic accounts for each user role:

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **ADMIN** | Admin Kumar | `admin@realestate.com` | `Admin@123` | Platform auditor & moderator |
| **AGENT** | Ravi Sharma | `agent.ravi@realestate.com` | `Agent@123` | Ravi Premier Realty |
| **AGENT** | Anita Desai | `agent.anita@realestate.com` | `Agent@123` | Metro Living Consultants |
| **BUYER** | Priya Nair | `buyer.priya@gmail.com` | `Buyer@123` | Verified buyer |
| **BUYER** | Rahul Varma | `buyer.rahul@gmail.com` | `Buyer@123` | Verified buyer |
| **BUYER** | Deepa Menon | `buyer.deepa@gmail.com` | `Buyer@123` | Verified buyer |

> **Note**: The web frontend features a **Quick Demo Login bar** at the top of the screen to switch between roles with a single click.

---

## 7. REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new Buyer or Agent | Public |
| `POST` | `/api/auth/login` | Login and receive signed JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Private |

### Properties (`/api/properties`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/properties` | List verified properties with pagination | Public |
| `GET` | `/api/properties/search` | Search & filter by city, price, BHK, type | Public |
| `GET` | `/api/properties/cities` | Group properties and count by city | Public |
| `GET` | `/api/properties/city/:city` | Get verified properties in a specific city | Public |
| `GET` | `/api/properties/:id` | View property details | Public (Owner/Admin can view unverified) |
| `POST` | `/api/properties` | Create new listing (starts as PENDING) | Agent |
| `GET` | `/api/properties/my` | View listings created by current agent | Agent |
| `PUT` | `/api/properties/:id` | Update property details | Owner Agent, Admin |
| `DELETE` | `/api/properties/:id` | Delete property listing | Owner Agent, Admin |
| `PUT` | `/api/properties/:id/verify` | Verify or Reject listing | Admin |
| `PUT` | `/api/properties/:id/status` | Update property status (`AVAILABLE`, `SOLD`, etc.) | Owner Agent, Admin |

### Favourites (`/api/favourites`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/favourites/:propertyId` | Save property to wishlist | Buyer |
| `DELETE` | `/api/favourites/:propertyId` | Remove property from wishlist | Buyer |
| `GET` | `/api/favourites` | List current buyer's saved properties | Buyer |

### Enquiries & Leads (`/api/enquiries`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/enquiries` | Submit enquiry for verified property | Buyer |
| `GET` | `/api/enquiries/my` | View buyer's submitted enquiries | Buyer |
| `GET` | `/api/enquiries/agent` | View inbound enquiries for agent's properties | Agent |
| `PUT` | `/api/enquiries/:id/status` | Update lead status and remarks | Owner Agent, Admin |

### Agents & Ratings (`/api/agents`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/agents/:id` | Get agent profile with rating aggregations | Public |
| `GET` | `/api/agents/:id/properties` | Get verified properties by agent | Public |
| `POST` | `/api/agents/:id/ratings` | Rate and review an agent (1–5 stars) | Buyer |

### Admin Moderation & Analytics (`/api/admin`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/properties/pending` | List unverified listings awaiting audit | Admin |
| `GET` | `/api/admin/properties/rejected` | List rejected property submissions | Admin |
| `GET` | `/api/admin/users` | List all users with role filtering | Admin |
| `GET` | `/api/admin/agents` | List agents with listing counts | Admin |
| `GET` | `/api/admin/reports/top-properties` | Top most-enquired properties (Aggregation) | Admin |
| `GET` | `/api/admin/reports/agent-performance` | Agent performance metrics (Aggregation) | Admin |
| `GET` | `/api/admin/reports/summary` | Overall system metrics & pipeline totals | Admin |

---

## 8. Business Rules & Validation State Machines

### A. Property Verification State Machine
* New listings created by agents are initialized with `isVerified: false` and `rejectionReason: null`.
* Public queries and search results exclusively filter `{ isVerified: true }`.
* Admin can transition a pending listing to:
  * `status: "VERIFIED"`: Sets `isVerified: true`, records `verifiedBy` and `verifiedAt`.
  * `status: "REJECTED"`: Sets `isVerified: false`, records `rejectionReason` (mandatory string).
* Re-verifying an already verified property returns `409 Conflict`.

### B. Property Status Transitions
* Valid statuses: `AVAILABLE`, `UNDER_NEGOTIATION`, `SOLD`, `RENTED`.
* `AVAILABLE` can transition to `UNDER_NEGOTIATION`, `SOLD`, or `RENTED`.
* `UNDER_NEGOTIATION` can transition to `AVAILABLE`, `SOLD`, or `RENTED`.
* Once marked `SOLD` or `RENTED`, a deal is completed. Transitioning from `SOLD` or `RENTED` back to `AVAILABLE` requires Admin intervention (Agents receive `409 Conflict`).

### C. Enquiry Lead Management State Machine
* Initial state on submission: `NEW`.
* Valid transitions:
  * `NEW` &rarr; `CONTACTED`, `REJECTED`, or `CLOSED`.
  * `CONTACTED` &rarr; `APPROVED`, `REJECTED`, or `CLOSED`.
  * `APPROVED` &rarr; `CLOSED` or `REJECTED`.
  * `REJECTED` / `CLOSED` &rarr; Terminal states (cannot revert to `NEW`).
* Invalid transitions return `409 Conflict` with `errorCode: INVALID_STATUS_TRANSITION`.

### D. Security & Role Constraints
* **Self-Assign Admin Prohibited**: Registration rejects requests attempting to set `role: "ADMIN"` (`400/403`).
* **Self-Rating Prohibited**: An agent cannot submit a rating for themselves (`403 Forbidden`).
* **Unverified Enquiries Blocked**: Enquiries can only be submitted against verified properties.
* **Compound Unique Indexes**:
  * `Favourite`: `(userId, propertyId)` prevents duplicate saves (`409 Conflict`).
  * `Rating`: `(agentId, buyerId)` updates existing reviews rather than duplicating.

---

## 9. Automated Testing

Run the automated integration test suite:
```bash
npm test
```
The test suite boots the application, executes real HTTP requests, and verifies:
* User registration, JWT login, and profile authorization
* Property creation by Agent and initial `PENDING` state
* Public search hiding unverified properties
* Admin property verification workflow (`PENDING` &rarr; `VERIFIED`)
* Advanced search and location filtering
* Favourites management and duplicate prevention (`409 Conflict`)
* Enquiry submission and state machine transitions
* Property status transitions and terminal state locks
* MongoDB aggregation report endpoints
* Error handling for invalid ObjectIds and role violations

---

## 10. Postman Collection

Import the included Postman collection:
* **File location**: `Postman/Real-Estate-Portal.postman_collection.json`
* Pre-configured with collection variables:
  * `{{baseUrl}}`: `http://localhost:3000/api`
  * `{{adminToken}}`, `{{agentToken}}`, `{{buyerToken}}`
  * `{{propertyId}}`, `{{enquiryId}}`, `{{agentId}}`
* Running login requests automatically extracts and sets the JWT tokens for subsequent authenticated requests.

---

## 11. Academic Evaluation Checklist

| Academic Requirement | Status | Implementation Details |
|---|---|---|
| Complete REST API Design | ✅ Complete | Follows standard REST conventions with descriptive status codes |
| JWT Authentication & Passwords | ✅ Complete | bcryptjs password hashing (cost 10) + JWT verification |
| Role-Based Access Control | ✅ Complete | Granular authorization for `BUYER`, `AGENT`, and `ADMIN` |
| MongoDB Database & Mongoose | ✅ Complete | 5 normalized schemas with indexes and embedded memory fallback |
| MongoDB Aggregations | ✅ Complete | Reports using `$group`, `$lookup`, `$unwind`, and `$project` |
| Centralized Error Handling | ✅ Complete | Formats CastError, DuplicateKey, ValidationError, AppError |
| State Machines & Business Logic | ✅ Complete | Guards property and enquiry transitions server-side |
| Working Frontend | ✅ Complete | Responsive Bootstrap 5 interface with quick role switcher |
| Postman Collection | ✅ Complete | Covers all endpoints with happy and failure paths |
| Automated Tests | ✅ Complete | 26/26 passing integration tests (`npm test`) |
