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
/api/garages/
├── route            # List approved garages
└── profile/         # Garage profile management
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

### Profile Management Pages
- **Customer Profile**: Personal information editing and vehicle management system
- **Garage Profile**: Garage information management with location updates and mechanic roster
- **Application Management**: Admin interfaces for reviewing and approving business applications

### Administrative Interfaces
- **System Admin Applications**: Centralized application review for garage and mechanic approvals
- **Garage Admin Applications**: Mechanic application management for garage-specific approvals
- **Enhanced Dashboards**: Modern card-based interfaces with feature status and navigation

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

## Current Implementation Status (Milestone 2)

### Functional Features
- **User Registration**: Customer self-registration with profile management
- **Vehicle Management**: Complete CRUD operations for customer vehicles
- **Business Applications**: Garage and mechanic application workflows with approval systems
- **Profile Management**: Comprehensive profile editing for all user types
- **Administrative Interfaces**: Application review systems for system and garage administrators
- **Location Services**: GPS integration for garage registration and location updates

### API Endpoints Available
- Customer registration and profile management
- Vehicle CRUD operations
- Business application submission and approval
- Garage profile management with location services
- Application status tracking and management

### User Workflows Implemented
1. **Customer Journey**: Registration → Profile Setup → Vehicle Management
2. **Garage Owner Journey**: Application → System Admin Approval → Profile Management → Mechanic Recruitment
3. **Mechanic Journey**: Application → Garage Admin Approval → Account Activation
4. **Admin Journey**: Application Review → Approval/Rejection → User Management

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