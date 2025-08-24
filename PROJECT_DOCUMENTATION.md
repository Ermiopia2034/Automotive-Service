# Project Documentation
## Web-Based Automotive Service Center Management System

### Architecture Overview

This application is built using Next.js 15 with the App Router pattern, implementing a role-based authentication system for automotive service management. The architecture follows modern full-stack patterns with clear separation of concerns.

---

## Technology Stack

**Core Framework:**
- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling

**Database & ORM:**
- Prisma ORM with SQLite database
- Database migrations for schema versioning
- Automated seeding for initial data

**Authentication & Security:**
- NextAuth.js with JWT strategy
- bcrypt for password hashing
- HTTP-only cookies for token storage
- Role-based access control middleware

**Additional Libraries:**
- nodemailer for email services
- Custom utility functions for common operations

---

## Database Architecture

### Schema Design
The database schema supports a multi-role system with the following core entities:

**User Management:**
- `User`: Core user entity with role-based classification
- `UserRole`: Enum-based role system (CUSTOMER, MECHANIC, GARAGE_ADMIN, SYSTEM_ADMIN)

**Business Entities:**
- `Vehicle`: Customer vehicle information and registration details
- `Mechanic`: Mechanic-specific information and garage assignments
- `Garage`: Service center locations with GPS coordinates and ratings
- `Application`: Business application system for garage and mechanic registrations
- `Service`: Available automotive services
- `ServiceRequest`: Customer service requests and appointments
- `VehicleStatus`: Real-time service progress tracking with detailed updates
- `OngoingService`: Active services being performed with completion tracking
- `AdditionalService`: Extra services requested during service delivery
- `Notification`: Real-time communication system between users

### Database Patterns
- All tables use auto-incrementing integer primary keys
- Foreign key relationships maintain referential integrity
- Timestamps track creation and modification dates
- Nullable fields accommodate optional data
- Text fields support varying content lengths

### Password Reset System
- Token-based password reset with expiration
- Secure random token generation
- Email-based reset workflow
- Automatic token cleanup on successful reset

---

## Authentication System

### Authentication Flow
The application implements a hybrid authentication approach combining NextAuth.js with custom JWT handling:

1. **Login Process**: Custom API endpoint validates credentials and generates JWT tokens
2. **Token Storage**: HTTP-only cookies for secure token management
3. **Session Management**: NextAuth.js handles session persistence
4. **Role Verification**: Middleware validates user roles for protected routes

### Security Implementation
- Passwords hashed using bcrypt with salt rounds
- JWT tokens with configurable expiration
- HTTP-only cookies prevent XSS attacks
- Secure headers and CSRF protection
- Role-based route protection

### User Roles & Permissions
- **SYSTEM_ADMIN**: Full system access and configuration
- **GARAGE_ADMIN**: Garage-specific administrative functions
- **MECHANIC**: Service delivery and customer interaction
- **CUSTOMER**: Service requests and account management

---

## API Architecture

### Route Structure
All API endpoints follow RESTful conventions under `/api/` directory:

```
/api/auth/
├── [...nextauth]/     # NextAuth.js handler
├── login/            # Custom JWT login
├── logout/           # Session termination
├── change-password/  # Password modification
├── forgot-password/  # Password reset request
└── reset-password/   # Password reset completion

/api/users/
├── register/         # Customer registration
└── profile/          # User profile management

/api/vehicles/        # Vehicle CRUD operations
/api/applications/    # Business application system
├── [id]/            # Application approval/rejection

/api/services/        # Service catalog management
├── route            # List/create services
└── [id]/           # Individual service operations

/api/garages/
├── route            # List approved garages with location filtering
├── profile/         # Garage profile management
└── [id]/services/   # Garage-specific service management
    ├── route        # Add/list garage services
    └── [serviceId]/ # Individual garage service operations

/api/requests/        # Service request management
├── route            # Create/list service requests with role-based filtering
└── [id]/           # Individual request operations and status updates

/api/vehicle-status/  # Advanced service tracking
├── route            # Create/list vehicle status updates
└── [id]/           # Status approval and management

/api/ongoing-services/ # Service execution tracking
├── route            # Add/list ongoing services
└── [id]/           # Complete/remove individual services

/api/additional-services/ # Additional service workflow
├── route            # Request additional services
└── [id]/           # Approve/decline additional services

/api/notifications/   # Comprehensive notification system
├── route            # List/mark/delete notifications with read status management

/api/service-completion/ # Service completion and pricing
├── route            # Complete services with final calculations
```

### API Patterns
- Consistent error handling with structured responses
- Request validation using TypeScript interfaces
- Database operations wrapped in try-catch blocks
- HTTP status codes following REST conventions
- JSON request/response format

### Request/Response Structure
```typescript
// Standard API Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

---

## File Structure & Organization

### Core Directories
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   ├── auth/              # Authentication & registration pages
│   │   ├── signin/        # Unified sign-in page
│   │   ├── register/      # Customer registration
│   │   ├── apply-garage/  # Garage application form
│   │   ├── apply-mechanic/ # Mechanic application form
│   │   ├── change-password/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── customer/          # Customer dashboard & profile
│   │   └── profile/       # Customer profile management
│   ├── garage-admin/      # Garage admin dashboard
│   │   ├── applications/  # Mechanic application reviews
│   │   └── profile/       # Garage profile management
│   ├── system-admin/      # System admin dashboard
│   │   └── applications/  # Application management interface
│   ├── mechanic/          # Mechanic dashboard
│   └── globals.css        # Global styles
├── lib/                   # Shared libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── email.ts          # Email service
│   └── prisma.ts         # Database client
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
│   ├── common.ts         # General utilities
│   ├── password.ts       # Password utilities
│   └── notifications.ts  # Notification system utilities
└── middleware.ts          # Route protection
```

### Naming Conventions
- Files: kebab-case for components, camelCase for utilities
- Functions: camelCase with descriptive names
- Components: PascalCase for React components
- Constants: UPPER_SNAKE_CASE for static values
- Database entities: PascalCase matching Prisma conventions

---

## Component Architecture

### Page Components
Each role has dedicated dashboard pages following a consistent structure:
- Layout wrapper with navigation
- Role-specific content sections
- Logout functionality
- Change password access

### Authentication & Registration Pages
- **Sign In**: Unified login for all user types with role detection and business application links
- **Customer Registration**: Self-service account creation with vehicle management
- **Garage Application**: Business registration with GPS location capture and admin approval workflow
- **Mechanic Application**: Apply to join approved garages with selection interface
- **Change Password**: Secure password modification form
- **Forgot Password**: Email-based password reset request
- **Reset Password**: Token-based password reset completion

### Service Management Interfaces
- **System Admin Services**: Complete service catalog management with CRUD operations and pricing
- **Garage Admin Services**: Service assignment interface for garage-specific offerings
- **Service Availability Toggle**: Real-time enable/disable functionality for garage services

### Profile Management Pages
- **Customer Profile**: Personal information editing and vehicle management system
- **Garage Profile**: Garage information management with location updates and mechanic roster
- **Application Management**: Admin interfaces for reviewing and approving business applications

### Administrative Interfaces
- **System Admin Applications**: Centralized application review for garage and mechanic approvals
- **System Admin Services**: Complete service catalog management with create, edit, delete operations
- **Garage Admin Applications**: Mechanic application management for garage-specific approvals
- **Garage Admin Services**: Service portfolio management with availability controls
- **Enhanced Dashboards**: Modern card-based interfaces with feature status and navigation

### Customer Discovery Interface
- **Garage Finder**: GPS-integrated location-based garage discovery with distance calculations
- **Advanced Filtering**: Search by name, distance radius, rating, and service availability
- **Service Browsing**: View available services, pricing, and garage details per location
- **Distance & Travel Time**: Real-time calculations with estimated travel duration

### Advanced Service Tracking Interfaces
- **Mechanic Service Dashboard**: Comprehensive service tracking with real-time status updates, ongoing service management, and completion workflows
- **Customer Progress Tracking**: Real-time service timeline with status updates, additional service approvals, and completion notifications
- **Garage Admin Service Oversight**: Complete service monitoring with status tracking across all active services
- **Service Completion Interface**: Final pricing calculations, service summaries, and invoice generation
- **Notification System**: Real-time communication between mechanics, customers, and administrators
- **Additional Service Workflow**: Customer approval system for services discovered during delivery

### UI Patterns
- Tailwind CSS utility classes for consistent styling
- Responsive design patterns for mobile compatibility
- Form validation with error state handling
- Loading states for asynchronous operations

---

## Security Patterns

### Authentication Security
- Enhanced password complexity requirements (minimum 8 characters, uppercase, lowercase, numbers)
- Secure password hashing with bcrypt
- JWT token expiration management
- Session invalidation on logout
- Business application approval workflows with role-based permissions

### Route Protection
- Middleware-based authentication checks
- Role-based access control
- Automatic redirection for unauthorized access
- Protected API endpoints with token validation

### Data Validation
- TypeScript interfaces for request validation
- Server-side input sanitization
- Database constraint enforcement
- Error handling without information leakage
- GPS coordinate validation for garage locations
- Application status tracking and duplicate prevention

---

## Development Patterns

### Code Organization
- Separation of concerns between UI, API, and database layers
- Utility functions for common operations
- Type definitions in dedicated files
- Configuration centralized in appropriate files

### Error Handling
- Structured error responses from API endpoints
- User-friendly error messages in UI
- Logging for debugging and monitoring
- Graceful degradation for failed operations

### Database Operations
- Prisma client initialization pattern
- Transaction handling for complex operations
- Proper connection management
- Error handling for database failures

---

## Current Implementation Status (Milestone 6)

### Functional Features
- **User Registration**: Customer self-registration with profile management
- **Vehicle Management**: Complete CRUD operations for customer vehicles
- **Business Applications**: Garage and mechanic application workflows with approval systems
- **Profile Management**: Comprehensive profile editing for all user types
- **Administrative Interfaces**: Application review systems for system and garage administrators
- **Location Services**: GPS integration for garage registration and location updates
- **Service Catalog Management**: Complete CRUD system for automotive services
- **Garage Service Assignment**: Garage-specific service portfolio management
- **Location-Based Discovery**: GPS-integrated garage finder with distance calculations
- **Advanced Search & Filtering**: Multi-criteria garage discovery with real-time filtering
- **Service Request System**: Complete assistance request workflow with customer location capture and mechanic assignment
- **Request Status Management**: Real-time request tracking with status transitions (PENDING → ACCEPTED → IN_PROGRESS → COMPLETED)
- **Role-Based Request Dashboards**: Specialized interfaces for customers, mechanics, and garage administrators
- **Request Communication Workflow**: Status updates and notifications between customers and service providers
- **Advanced Service Tracking**: Real-time service progress updates with detailed status tracking
- **Ongoing Service Management**: Active service tracking with completion dates and progress monitoring
- **Additional Service Workflow**: Customer approval system for services discovered during delivery
- **Comprehensive Notification System**: Real-time notification delivery with standardized templates and read status management
- **Service Completion System**: Final pricing calculations with detailed service summaries and invoicing

### API Endpoints Available
- Customer registration and profile management
- Vehicle CRUD operations
- Business application submission and approval
- Garage profile management with location services
- Application status tracking and management
- Service catalog management with pricing controls
- Garage-service assignment and availability management
- Location-based garage discovery with distance filtering
- Service request creation, management, and status tracking
- Role-based service request access control and filtering
- Mechanic request acceptance and status updates
- Administrative request oversight and monitoring
- Vehicle status tracking with real-time updates
- Ongoing service management with completion tracking
- Additional service request and approval workflows
- Comprehensive notification system with standardized templates, CRUD operations, and real-time delivery
- Service completion with final pricing calculations

### User Workflows Implemented
1. **Customer Journey**: Registration → Profile Setup → Vehicle Management → Garage Discovery → Service Browsing → Service Request Creation → Request Status Tracking → Service Progress Updates → Additional Service Approval → Service Completion
2. **Garage Owner Journey**: Application → System Admin Approval → Profile Management → Service Portfolio Setup → Mechanic Recruitment → Request Oversight → Service Monitoring
3. **Mechanic Journey**: Application → Garage Admin Approval → Account Activation → Request Acceptance → Service Delivery → Status Updates → Service Completion
4. **Admin Journey**: Application Review → Approval/Rejection → User Management → Service Catalog Management → System Oversight
5. **Service Management**: System Admin Creates Services → Garage Admin Assigns to Garage → Customer Discovers Services
6. **Service Request Flow**: Customer Location Capture → Garage Selection → Request Submission → Mechanic Assignment → Status Updates → Service Completion
7. **Advanced Service Tracking**: Service Request → Mechanic Assignment → Real-time Status Updates → Ongoing Service Management → Additional Service Requests → Customer Approvals → Service Completion → Final Pricing
8. **Notification System**: Automated notification delivery across all service workflows with standardized templates and real-time updates

## Notification System Architecture

### Notification Types & Templates
The system implements a comprehensive notification framework with standardized types and templates:

**Core Notification Types:**
- `REQUEST_CREATED`: New service request notifications to garage staff
- `REQUEST_ACCEPTED`: Service acceptance confirmations to customers
- `REQUEST_IN_PROGRESS`: Service progress updates
- `REQUEST_COMPLETED`: Service completion notifications
- `REQUEST_CANCELLED`: Cancellation notifications to all parties
- `STATUS_UPDATE`: Real-time service status updates requiring customer approval
- `STATUS_APPROVED/DECLINED`: Customer approval responses to mechanics
- `SERVICE_STARTED/FINISHED`: Individual service progress notifications
- `ADDITIONAL_SERVICE_REQUESTED`: Additional service approval requests
- `ADDITIONAL_SERVICE_APPROVED/DECLINED`: Customer responses to additional services
- `SERVICE_COMPLETION`: Final service completion with pricing information

### Notification Infrastructure
- **Centralized Utility**: [`notifications.ts`](src/utils/notifications.ts:1) provides standardized notification creation
- **Template System**: Context-aware notification templates with consistent messaging
- **CRUD Operations**: Complete notification management with read/unread status tracking
- **Bulk Operations**: Mark all notifications as read or delete multiple notifications
- **Real-time Delivery**: Automatic notification triggering based on system events
- **Error Handling**: Robust error handling with fallback mechanisms

### Integration Points
All API endpoints automatically trigger appropriate notifications:
- Service request creation notifies garage admins and mechanics
- Status updates notify customers with approval requirements
- Service progress notifications keep all parties informed
- Completion notifications provide final pricing and summaries

---

## Configuration & Environment

### Required Environment Variables
```
NEXTAUTH_SECRET=<random-secret-key>
NEXTAUTH_URL=<application-url>
DATABASE_URL=<database-connection-string>
EMAIL_HOST=<smtp-host>
EMAIL_PORT=<smtp-port>
EMAIL_USER=<email-username>
EMAIL_PASS=<email-password>
```

### Default System Access
- **System Admin**: username `admin`, password `admin123`
- Database seeded with initial admin account
- Additional users created through registration flow

---

## Extension Guidelines

### Adding New Features
1. Follow existing file structure patterns
2. Implement proper TypeScript typing
3. Add database schema changes via Prisma migrations
4. Create corresponding API endpoints with validation
5. Build UI components following established patterns
6. Update middleware for any new protected routes

### Database Extensions
- Use Prisma schema modifications
- Generate and apply migrations
- Update seed file for test data
- Maintain foreign key relationships

### API Extensions
- Follow RESTful conventions
- Implement consistent error handling
- Add proper authentication checks
- Document new endpoints

This architecture provides a solid foundation for automotive service management features while maintaining security, scalability, and maintainability standards.