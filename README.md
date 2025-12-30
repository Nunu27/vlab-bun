# 🧪 vLab - Virtual Lab Platform for Networking Education

<div align="center">

![vLab Banner](https://img.shields.io/badge/vLab-Virtual%20Lab%20Platform-blue?style=for-the-badge)
![Build and Deploy](https://github.com/Nunu27/vlab-bun/actions/workflows/deploy.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**A comprehensive virtual lab platform for networking education with real-time scoring and hands-on MikroTik labs**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 About

vLab is a cutting-edge virtual lab platform designed for networking education, focusing on **MikroTik labs** with real-time scoring capabilities similar to Cisco Packet Tracer. Built for universities, training centers, and self-learners, vLab provides an interactive environment for practicing networking concepts through hands-on labs.

### 🎯 Key Goals

- **Hands-on Learning**: Practice networking concepts in a safe, virtual environment
- **Real-time Scoring**: Instant feedback on lab completion and configuration accuracy
- **MikroTik Focus**: Specialized labs for MikroTik RouterOS and networking
- **Accessible**: Browser-based access through Guacamole (no client installation)
- **Scalable**: Built with containerization for easy deployment and scaling

---

## ✨ Features

### 🖥️ Core Features

- **🔬 Virtual Lab Environment**
  - Powered by [Containerlab](https://containerlab.dev/) for network topology simulation
  - Support for MikroTik RouterOS containers
  - Multiple concurrent lab sessions
  - Isolated network environments per user

- **🌐 Remote Access**
  - Browser-based access via [Apache Guacamole](https://guacamole.apache.org/)
  - No client software installation required
  - SSH, VNC, and RDP support
  - Responsive web interface

- **📊 Real-time Scoring System**
  - Automatic validation of lab configurations
  - Real-time progress tracking (similar to Cisco Packet Tracer)
  - Instant feedback on task completion
  - Detailed scoring reports

- **👥 User Management**
  - Role-based access control (Admin, Lecturer, Student)
  - Department and study program organization
  - CAS (Central Authentication Service) integration
  - Session management

- **📚 Lab Management**
  - Pre-configured MikroTik lab scenarios
  - Custom lab creation by lecturers
  - Lab templates and reusability
  - Difficulty levels and prerequisites

### 🚀 Upcoming Features (Roadmap)

- [ ] **Advanced Scoring**
  - Configuration validation engine
  - Automated testing of network connectivity
  - Performance benchmarking
  - Partial scoring for incomplete tasks

- [ ] **Lab Library**
  - Pre-built MikroTik scenarios (Routing, Firewall, VPN, etc.)
  - Community-contributed labs
  - Lab versioning and updates

- [ ] **Enhanced Analytics**
  - Student progress tracking
  - Lab completion statistics
  - Time-on-task metrics
  - Performance insights for educators

- [ ] **Collaboration Features**
  - Team-based labs
  - Shared topology scenarios
  - Real-time collaboration

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: [Rsbuild](https://rsbuild.dev/) (Fast Rspack-based builder)
- **Routing**: TanStack Router v1 with auto code-splitting
- **State Management**: TanStack Query for server state
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Forms**: TanStack Form with validation
- **Styling**: Tailwind CSS 4 with custom design system

### Backend

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Framework**: [Elysia](https://elysiajs.com/) - Ergonomic web framework
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Caching**: Redis for session storage and caching
- **API**: RESTful with OpenAPI documentation
- **Validation**: TypeBox for runtime type validation

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Orchestration**: Containerlab for network topology
- **Remote Access**: Apache Guacamole
- **Reverse Proxy**: Nginx
- **Process Manager**: Supervisor
- **CI/CD**: GitHub Actions
- **Registry**: GitHub Container Registry (GHCR)

### DevOps

- **Version Control**: Git & GitHub
- **Deployment**: Automated via GitHub Actions
- **Monitoring**: Built-in health checks
- **Database Migrations**: Drizzle Kit

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18+ (or Bun runtime)
- **PostgreSQL**: 14+
- **Redis**: 7+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/Nunu27/vlab-bun.git
   cd vlab-bun
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis credentials
   ```

4. **Run database migrations**

   ```bash
   cd backend
   bun run drizzle:migrate
   ```

5. **Seed the database (optional)**

   ```bash
   bun run seed
   ```

6. **Start development servers**

   ```bash
   # From root directory
   bun run dev

   # This starts both:
   # - Frontend: http://localhost:5173
   # - Backend: http://localhost:3000
   ```

### Production Deployment

```bash
# Create .env file with production settings
cp .env.example .env

# Start all services
docker compose up -d

# Run seeder (first time only)
docker compose exec app vlab seed
```

---

## 📚 Documentation

### Project Structure

```
vlab/
├── backend/                 # Elysia backend application
│   ├── src/
│   │   ├── db/             # Database schema and connections
│   │   ├── routes/         # API route handlers
│   │   ├── middlewares/    # Express-like middlewares
│   │   ├── services/       # Business logic services
│   │   ├── seeder/         # Database seeders
│   │   └── index.ts        # Application entry point
│   ├── drizzle.config.ts   # Drizzle ORM configuration
│   └── package.json
│
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── routes/        # TanStack Router routes
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   └── styles/        # Global styles
│   ├── rsbuild.config.ts  # Rsbuild configuration
│   └── package.json
│
├── .github/
│   └── workflows/        # GitHub Actions CI/CD
│       ├── ci-cd.yml
│
├── compose.yaml    # Local/production stack
├── Dockerfile           # Multi-stage production build
└── README.md          # This file
```

---

## 🧪 Development

### Available Scripts

```bash
# Development
bun run dev              # Start both frontend and backend
bun run backend dev      # Start backend only
bun run frontend dev     # Start frontend only

# Building
bun run build           # Build both frontend and backend
bun run frontend:build  # Build frontend only

# Database
cd backend
bun run seed            # Run database seeders

# Linting
bun run lint            # Lint all packages
bun run frontend lint   # Lint frontend only
```

### Database Schema

The database schema is defined using Drizzle ORM in `backend/src/db/schema/`:

- **auth.ts** - User authentication tables
- **lab.ts** - Lab and device management
- **index.ts** - Schema exports

### API Documentation

When running in development, OpenAPI documentation is available at:

- http://localhost:3000/openapi

---

## 🏗️ Architecture

### Key Components

1. **Frontend (React + Rsbuild)**
   - Server-side routing with TanStack Router
   - API client with type-safety via Eden Treaty
   - Component library with Radix UI + Tailwind

2. **Backend (Elysia + Bun)**
   - High-performance API server
   - Type-safe database queries with Drizzle
   - Session management with Redis
   - OpenAPI documentation

3. **Database (PostgreSQL)**
   - Relational data storage
   - Migrations managed by Drizzle Kit
   - Connection pooling

4. **Cache (Redis)**
   - Session storage
   - Response caching

5. **Containerlab** (Future Integration)
   - Network topology simulation
   - MikroTik container orchestration
   - Isolated lab environments

6. **Guacamole** (Future Integration)
   - Browser-based remote access
   - Protocol support: SSH, VNC, RDP
   - Session recording

---

## 🔐 Security

- **Authentication**: Session-based with CAS integration
- **Authorization**: Role-based access control (RBAC)
- **Password Hashing**: Secure password storage
- **HTTPS**: TLS/SSL encryption in production
- **CORS**: Configured for security
- **Helmet**: Security headers via elysia-helmet
- **Input Validation**: TypeBox schema validation
- **SQL Injection**: Protected via Drizzle ORM

---

## 📊 Project Status

### Current Version: v1.0.0 (MVP)

**Status**: Active Development 🚧

### Completed ✅

- [x] User authentication and authorization
- [x] Department and study program management
- [x] Basic lab structure
- [x] RESTful API with OpenAPI docs
- [x] Frontend UI with React + TanStack
- [x] Database schema and migrations
- [x] CI/CD pipeline with GitHub Actions
- [x] Docker containerization
- [x] Automated VPS deployment

### In Progress 🔄

- [x] Containerlab integration
- [x] Guacamole integration
- [ ] Real-time scoring system
- [x] MikroTik lab templates
- [x] Lab session management

### Planned 📋

- [ ] Advanced scoring algorithms
- [ ] Lab analytics dashboard

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Containerlab** - Network topology simulation
- **Apache Guacamole** - Clientless remote desktop gateway
- **MikroTik** - RouterOS and networking education
- **Elysia** - Fast and ergonomic web framework
- **Drizzle ORM** - Type-safe database toolkit
- **TanStack** - Powerful React tools

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Nunu27/vlab-bun/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Nunu27/vlab-bun/discussions)
- **Email**: [wisnu.agung.001@gmail.com](mailto:wisnu.agung.001@gmail.com)

---

## 🗺️ Roadmap

### Phase 1: Foundation (Current)

- ✅ Core application structure
- ✅ User management
- ✅ Basic UI/UX
- ✅ Deployment automation

### Phase 2: Lab Integration (Q4 2025)

- ✅ Containerlab integration
- ✅ Guacamole setup
- ✅ MikroTik container templates
- ✅ Lab session lifecycle

### Phase 3: Scoring System (Q1 2026)

- 🔄 Real-time configuration validation
- 🔄 Automated scoring engine
- 🔄 Progress tracking
- 🔄 Performance analytics

---

<div align="center">

**Built with ❤️ for networking education**

[⬆ Back to Top](#-vlab---virtual-lab-platform-for-networking-education)

</div>
