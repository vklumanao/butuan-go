# Software Requirements Specification (SRS)

## ButuanGo

> An On-Demand Local Task Marketplace Platform

## Table of Contents

1. [Introduction](#chapter-1--introduction)
2. [Overall Description](#chapter-2--overall-description)
3. [System Overview](#chapter-3--system-overview)
4. [User Roles](#chapter-4--user-roles)
5. [Functional Requirements](#chapter-5--functional-requirements)
6. [Use Cases](#chapter-6--use-cases)
7. [Business Rules](#chapter-7--business-rules)
8. [Data Requirements](#chapter-8--data-requirements)
9. [User Interface Requirements](#chapter-9--user-interface-requirements)
10. [Non-Functional Requirements](#chapter-10--non-functional-requirements)
11. [Security Requirements](#chapter-11--security-requirements)
12. [Database Design](#chapter-12--database-design)
13. [System Architecture](#chapter-13--system-architecture)
14. [Process Flow](#chapter-14--process-flow)
15. [Sequence Diagrams](#chapter-15--sequence-diagrams)
16. [Activity Diagrams](#chapter-16--activity-diagrams)
17. [State Diagram](#chapter-17--state-diagram)
18. [API Specification](#chapter-18--api-specification)
19. [Validation Rules](#chapter-19--validation-rules)
20. [Future Enhancements](#chapter-20--future-enhancements)
21. [Appendices](#appendices)
22. [Estimated Length](#estimated-length)

## Chapter 1 — Introduction

### 1.1 Purpose

### 1.2 Intended Audience

### 1.3 Project Scope

### 1.4 Definitions, Acronyms, and Abbreviations

### 1.5 References

### 1.6 Document Overview

## Chapter 2 — Overall Description

### 2.1 Product Perspective

### 2.2 Product Functions

### 2.3 User Classes

### 2.4 Operating Environment

### 2.5 Design Constraints

### 2.6 User Documentation

### 2.7 Assumptions and Dependencies

## Chapter 3 — System Overview

- Business Problem
- Proposed Solution
- Value Proposition
- Objectives
- Expected Benefits
- Future Expansion

## Chapter 4 — User Roles

### 4.1 Guest

- Capabilities

### 4.2 Requestor

- Responsibilities
- Permissions
- Limitations
- A normal account may activate this workspace regardless of its registration starting mode.

### 4.3 Runner

- Responsibilities
- Permissions
- Limitations
- A normal account may activate this workspace regardless of its registration starting mode.

### 4.4 Administrator (Future)

- Responsibilities

## Chapter 5 — Functional Requirements

### 5.1 Authentication Module

- **FR-1:** Register
- **FR-2:** Login
- **FR-3:** Logout
- **FR-4:** Password Reset
- **FR-5:** Email Verification
- **FR-6:** Profile

### 5.2 Request Module

- **FR-7:** Create Request
- **FR-8:** Edit Request
- **FR-9:** Delete Request
- **FR-10:** View Requests
- **FR-11:** Cancel Request

### 5.3 Runner Module

- **FR-12:** Browse Requests
- **FR-13:** Accept Request
- **FR-14:** Update Status
- **FR-15:** Submit Completion

### 5.4 Dashboard Module

- **FR-16:** Requestor Dashboard
- **FR-17:** Runner Dashboard

### 5.5 Profile Module

- **FR-18:** Update Profile
- **FR-19:** Upload Avatar
- **FR-19A:** Manage private saved addresses from either Requestor or Runner workspace

### 5.6 Search Module

- **FR-20:** Search Requests
- **FR-21:** Filter Requests
- **FR-22:** Sort Requests

## Chapter 6 — Use Cases

| ID   | Use Case           |
| ---- | ------------------ |
| UC-1 | Register           |
| UC-2 | Login              |
| UC-3 | Create Request     |
| UC-4 | Browse Requests    |
| UC-5 | Accept Request     |
| UC-6 | Start Task         |
| UC-7 | Complete Task      |
| UC-8 | Confirm Completion |

Each use case will include:

- Goal
- Actors
- Preconditions
- Main Flow
- Alternative Flow
- Postconditions
- Exceptions

## Chapter 7 — Business Rules

- A request can only have one Runner.
- A normal user account may switch between Requestor and Runner workspaces without creating another account.
- The registration role is the starting mode; `active_role` is the current authorized workspace.
- A user cannot browse or accept a request posted by the same account.
- Workspace switching does not remove existing request ownership, Runner assignments, or capacity restrictions.
- Saved addresses belong to the account, are manageable from either workspace, and remain private to their owner.
- Only the owning Requestor may cancel an `OPEN` or `ACCEPTED` request before work starts.
- The assigned Runner may release an `ACCEPTED` request back to `OPEN` with a required reason.
- Releasing or cancelling before start removes the Runner's private location access and frees their active-task capacity.
- Only authorized lifecycle RPCs may change task status; each transition is restricted to its owning Requestor or assigned Runner.
- Completed requests cannot be edited.
- The service fee cannot be negative.
- The expense budget cannot be negative.

## Chapter 8 — Data Requirements

### 8.1 Entity Relationship Diagram

### 8.2 Tables

- `profiles`
- `requests`
- `request_updates`
- `notifications`
- `categories`
- `request_locations`
- `saved_addresses`
- Future tables

Each table definition will include:

- Attributes
- Data types
- Constraints
- Relationships

## Chapter 9 — User Interface Requirements

### 9.1 Application Interfaces

- Landing Page
- Login
- Register
- Dashboard
- Request Details
- Profile

### 9.2 Responsive Views

- Mobile View
- Tablet View
- Desktop View

### 9.3 Accessibility

## Chapter 10 — Non-Functional Requirements

- Performance
- Availability
- Security
- Scalability
- Maintainability
- Usability
- Reliability
- Portability
- Compatibility
- Localization
- Accessibility
- Backup
- Recovery

## Chapter 11 — Security Requirements

- Authentication
- Authorization
- Password Hashing
- JSON Web Tokens (JWT)
- HTTPS
- Rate Limiting
- Row-Level Security (RLS)
- SQL Injection Prevention
- Cross-Site Scripting (XSS) Prevention
- Cross-Site Request Forgery (CSRF) Protection
- Input Validation
- Audit Logs

## Chapter 12 — Database Design

- Tables
- Relationships
- Indexes
- Constraints
- Triggers
- Views
- Policies

## Chapter 13 — System Architecture

- Overall Architecture
- Frontend
- Backend
- Database
- Authentication
- Storage
- Deployment
- Future AI Module

## Chapter 14 — Process Flow

- Registration Flow
- Login Flow
- Request Flow
- Acceptance Flow
- Completion Flow
- Confirmation Flow

## Chapter 15 — Sequence Diagrams

- Register
- Login
- Create Request
- Accept Request
- Complete Request

## Chapter 16 — Activity Diagrams

- User Registration
- Request Creation
- Runner Workflow
- Completion Workflow

## Chapter 17 — State Diagram

### 17.1 Request Status Lifecycle

```text
OPEN
  ↓
ACCEPTED
  ↓
IN_PROGRESS
  ↓
AWAITING_CONFIRMATION
  ↓
COMPLETED

Recovery before work starts:

ACCEPTED → OPEN (Runner releases with a reason)
OPEN → CANCELLED (Requestor cancels)
ACCEPTED → CANCELLED (Requestor cancels before start)
```

## Chapter 18 — API Specification

- Authentication
- Requests
- Profiles
- Future Notifications
- Future Payments

## Chapter 19 — Validation Rules

- Email
- Password
- Phone Number
- Budget
- Status Transition
- Permissions

## Chapter 20 — Future Enhancements

- Payment Gateway
- Escrow
- Chat
- Maps
- GPS
- AI Matching
- AI Pricing
- Ratings
- Reviews
- Identity Verification
- Notifications
- Mobile App

## Appendices

- Glossary
- Database Schema
- SQL Scripts
- Wireframes
- Color Palette
- Project Folder Structure
- Coding Standards
- Deployment Guide
- API Examples
