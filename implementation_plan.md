# Web Based Automotive Service Center Locating and Management System
## Complete Implementation Plan - Next.js + SQLite

## Project Overview
A web-based system enabling car owners to locate nearby garages, request assistance, and manage automotive services. The system serves four user types: Customers, Mechanics, Garage Admins, and System Admins.

## Technology Stack
- **Frontend & Backend**: Next.js 14+ (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Location Services**: Browser Geolocation API
- **Email**: Nodemailer or similar

## Database Schema

### Core Tables
```sql
-- Users table (unified for all user types)
Users {
  id: INTEGER PRIMARY KEY
  username: TEXT UNIQUE
  email: TEXT UNIQUE
  password: TEXT (hashed)
  firstName: TEXT
  lastName: TEXT
  phoneNumber: TEXT
  userType: TEXT ('customer', 'mechanic', 'garage_admin', 'system_admin')
  createdAt: DATETIME
  updatedAt: DATETIME
}

-- Garages table
Garages {
  id: INTEGER PRIMARY KEY
  garageName: TEXT
  adminId: INTEGER (FK to Users)
  latitude: REAL
  longitude: REAL
  rating: REAL DEFAULT 0
  available: BOOLEAN DEFAULT true
  removed: BOOLEAN DEFAULT false
  approved: BOOLEAN DEFAULT false
  createdAt: DATETIME
}

-- Mechanics table
Mechanics {
  id: INTEGER PRIMARY KEY
  userId: INTEGER (FK to Users)
  garageId: INTEGER (FK to Garages)
  approved: BOOLEAN DEFAULT false
  removed: BOOLEAN DEFAULT false
}

-- Vehicles table
Vehicles {
  id: INTEGER PRIMARY KEY
  customerId: INTEGER (FK to Users)
  vehicleType: TEXT
  plateNumber: TEXT
  plateCode: TEXT
  countryCode: TEXT
  color: TEXT
}

-- Services table
Services {
  id: INTEGER PRIMARY KEY
  serviceName: TEXT
  estimatedPrice: REAL
  removed: BOOLEAN DEFAULT false
  createdBy: INTEGER (FK to Users)
}

-- GarageServices (many-to-many)
GarageServices {
  id: INTEGER PRIMARY KEY
  garageId: INTEGER (FK to Garages)
  serviceId: INTEGER (FK to Services)
  available: BOOLEAN DEFAULT true
}

-- ServiceRequests table
ServiceRequests {
  id: INTEGER PRIMARY KEY
  customerId: INTEGER (FK to Users)
  garageId: INTEGER (FK to Garages)
  mechanicId: INTEGER (FK to Users) NULL
  vehicleId: INTEGER (FK to Vehicles)
  latitude: REAL
  longitude: REAL
  status: TEXT ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')
  createdAt: DATETIME
}

-- VehicleStatus table
VehicleStatus {
  id: INTEGER PRIMARY KEY
  serviceRequestId: INTEGER (FK to ServiceRequests)
  mechanicId: INTEGER (FK to Users)
  description: TEXT
  approved: BOOLEAN DEFAULT false
  createdAt: DATETIME
}

-- OngoingServices table
OngoingServices {
  id: INTEGER PRIMARY KEY
  statusId: INTEGER (FK to VehicleStatus)
  serviceId: INTEGER (FK to Services)
  expectedDate: DATETIME
  serviceFinished: BOOLEAN DEFAULT false
  totalPrice: REAL DEFAULT 0
}

-- AdditionalServices table
AdditionalServices {
  id: INTEGER PRIMARY KEY
  statusId: INTEGER (FK to VehicleStatus)
  serviceId: INTEGER (FK to Services)
  approved: BOOLEAN DEFAULT false
  totalPrice: REAL DEFAULT 0
}

-- Notifications table
Notifications {
  id: INTEGER PRIMARY KEY
  senderId: INTEGER (FK to Users)
  receiverId: INTEGER (FK to Users)
  type: TEXT
  title: TEXT
  message: TEXT
  read: BOOLEAN DEFAULT false
  createdAt: DATETIME
}

-- Ratings table
Ratings {
  id: INTEGER PRIMARY KEY
  customerId: INTEGER (FK to Users)
  garageId: INTEGER (FK to Garages)
  mechanicId: INTEGER (FK to Users) NULL
  rating: INTEGER (1-10)
  comment: TEXT
  createdAt: DATETIME
}

-- Applications table
Applications {
  id: INTEGER PRIMARY KEY
  applicantId: INTEGER (FK to Users)
  applicationType: TEXT ('garage', 'mechanic')
  garageId: INTEGER (FK to Garages) NULL
  approved: BOOLEAN NULL
  createdAt: DATETIME
}
```

## Implementation Milestones

### Milestone 1: Project Setup & Authentication (Week 1-2)

#### 1.1 Initial Setup
- [ ] Create Next.js project with TypeScript
- [ ] Install and configure Prisma with SQLite
- [ ] Setup Tailwind CSS
- [ ] Create project folder structure
- [ ] Initialize Git repository

#### 1.2 Database Setup
- [ ] Create Prisma schema with all tables
- [ ] Generate Prisma client
- [ ] Create database migration
- [ ] Seed database with initial system admin

#### 1.3 Authentication System
- [ ] Install and configure NextAuth.js
- [ ] Create login API routes for all user types
- [ ] Implement password hashing (bcrypt)
- [ ] Create middleware for route protection
- [ ] Build login pages for each user type
- [ ] Implement logout functionality

#### 1.4 Password Management
- [ ] Implement change password functionality
- [ ] Create forgot password with email reset
- [ ] Build password reset pages
- [ ] Implement email service for password reset

### Milestone 2: User Registration & Profile Management (Week 3)

#### 2.1 Customer Registration
- [ ] Create customer registration API
- [ ] Build customer registration form
- [ ] Implement vehicle registration (linked to customer)
- [ ] Create customer profile page
- [ ] Add profile editing functionality

#### 2.2 Mechanic Registration
- [ ] Create mechanic application system
- [ ] Build mechanic registration form
- [ ] Link mechanics to garages
- [ ] Implement mechanic approval workflow

#### 2.3 Garage Registration
- [ ] Create garage application system
- [ ] Build garage registration form with location
- [ ] Implement geolocation capture
- [ ] Create garage approval workflow
- [ ] Build garage profile management

### Milestone 3: Core Location & Service Discovery (Week 4)

#### 3.1 Garage Location System
- [ ] Implement garage location storage (lat/lng)
- [ ] Build garage finder with distance calculation
- [ ] Create garage listing with distance sorting
- [ ] Add map integration (optional: use simple distance display)
- [ ] Implement search filters

#### 3.2 Service Management
- [ ] Create service catalog system
- [ ] Build admin interface for managing services
- [ ] Implement garage-specific service assignment
- [ ] Add service pricing management
- [ ] Create service availability toggle

### Milestone 4: Assistance Request System (Week 5)

#### 4.1 Request Creation
- [ ] Build assistance request form
- [ ] Capture customer location
- [ ] Implement garage selection
- [ ] Create service request routing
- [ ] Add request confirmation system

#### 4.2 Request Management
- [ ] Create mechanic dashboard for new requests
- [ ] Implement request acceptance workflow
- [ ] Build request status tracking
- [ ] Add request assignment to mechanics
- [ ] Implement request cancellation

### Milestone 5: Service Status & Communication (Week 6)

#### 5.1 Status Management
- [ ] Create vehicle status creation system
- [ ] Build status update workflow
- [ ] Implement customer status approval
- [ ] Add service progress tracking
- [ ] Create completion marking system

#### 5.2 Additional Services
- [ ] Build additional service request system
- [ ] Implement customer approval workflow
- [ ] Add pricing for additional services
- [ ] Create service modification system

### Milestone 6: Notification System (Week 7)

#### 6.1 Core Notification System
- [ ] Create notification API endpoints
- [ ] Build notification storage system
- [ ] Implement real-time notification delivery
- [ ] Create notification templates
- [ ] Add notification read/unread status

#### 6.2 Notification Types
- [ ] Assistance request notifications
- [ ] Status update notifications
- [ ] Additional service notifications
- [ ] Approval notifications
- [ ] Completion notifications

### Milestone 7: Admin Dashboards (Week 8)

#### 7.1 System Admin Dashboard
- [ ] Create admin login interface
- [ ] Build garage approval system
- [ ] Implement garage management (view/remove)
- [ ] Create service catalog management
- [ ] Add user feedback viewing
- [ ] Build application review system

#### 7.2 Garage Admin Dashboard
- [ ] Create garage admin interface
- [ ] Build mechanic management system
- [ ] Implement service assignment
- [ ] Add performance review system
- [ ] Create garage service management

#### 7.3 Mechanic Dashboard
- [ ] Build mechanic interface
- [ ] Create request acceptance system
- [ ] Implement service status updates
- [ ] Add customer communication tools
- [ ] Create service completion workflow

### Milestone 8: Rating & Feedback System (Week 9)

#### 8.1 Rating System
- [ ] Create rating submission forms
- [ ] Implement 1-10 rating scale
- [ ] Add comment system
- [ ] Calculate average ratings
- [ ] Display ratings on garage profiles

#### 8.2 Feedback Management
- [ ] Build feedback viewing for all user types
- [ ] Create feedback moderation system
- [ ] Implement rating-based garage ranking
- [ ] Add feedback filtering and search

### Milestone 9: Advanced Features & Optimization (Week 10)

#### 9.1 Advanced Service Management
- [ ] Create ongoing service tracking
- [ ] Implement service timeline
- [ ] Add cost estimation system
- [ ] Build service history
- [ ] Create recurring service scheduling

#### 9.2 Reporting & Analytics
- [ ] Build basic analytics dashboard
- [ ] Create service completion reports
- [ ] Implement garage performance metrics
- [ ] Add customer satisfaction tracking

### Milestone 10: UI/UX Polish & Testing (Week 11-12)

#### 10.1 User Interface Polish
- [ ] Responsive design implementation
- [ ] Mobile optimization
- [ ] Accessibility improvements
- [ ] Loading states and error handling
- [ ] Form validation enhancement

#### 10.2 Testing & Quality Assurance
- [ ] Unit testing for critical functions
- [ ] Integration testing for workflows
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Security review

#### 10.3 Deployment Preparation
- [ ] Environment configuration
- [ ] Production database setup
- [ ] Security hardening
- [ ] Error monitoring setup
- [ ] Backup strategy implementation

## API Endpoints Structure

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password
- `PATCH /api/auth/change-password` - Change password

### User Management
- `POST /api/users/register` - User registration
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile

### Vehicle Management
- `POST /api/vehicles` - Register vehicle
- `GET /api/vehicles` - Get user vehicles
- `PATCH /api/vehicles/:id` - Update vehicle

### Garage Management
- `GET /api/garages` - List nearby garages
- `GET /api/garages/:id` - Get garage details
- `POST /api/garages/apply` - Apply for membership
- `PATCH /api/garages/:id` - Update garage

### Service Management
- `GET /api/services` - List all services
- `POST /api/services` - Create service
- `PATCH /api/services/:id` - Update service
- `DELETE /api/services/:id` - Remove service

### Request Management
- `POST /api/requests` - Create service request
- `GET /api/requests` - Get user requests
- `PATCH /api/requests/:id/accept` - Accept request
- `PATCH /api/requests/:id/status` - Update status

### Notification Management
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `POST /api/notifications` - Send notification

### Rating Management
- `POST /api/ratings` - Submit rating
- `GET /api/ratings/garage/:id` - Get garage ratings

## Key Implementation Notes

1. **Security**: All passwords must be hashed using bcrypt
2. **Validation**: Implement comprehensive input validation on all forms
3. **Error Handling**: Proper error responses for all API endpoints
4. **Location**: Use browser geolocation API for location capture
5. **Real-time**: Consider implementing WebSocket for real-time notifications
6. **Mobile**: Ensure mobile responsiveness for field use
7. **Offline**: Consider basic offline capabilities for critical functions

## Non-Functional Requirements Implementation

- **Performance**: Response time < 10 seconds (implement caching where needed)
- **Availability**: Design for 12 hours/day, 7 days/week uptime
- **Security**: Implement proper authentication, authorization, and input validation
- **Usability**: Intuitive UI similar to modern web applications
- **Scalability**: Design database schema to handle growth

This implementation plan covers every feature and functionality mentioned in the original documentation, organized into manageable milestones that can be executed by any competent developer without requiring reference to the source documentation.