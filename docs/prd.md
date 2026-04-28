# Requirements Document

## 1. Application Overview

**Application Name**: SafeProof

**Description**: A secure AI-powered evidence organizer web application designed for women experiencing harassment or abuse. The application helps users organize evidence for legal, workplace, or institutional reporting by providing case management, evidence upload, AI-powered analysis, timeline generation, and professional report creation capabilities.

## 2. Users and Use Scenarios

**Target Users**: Women experiencing harassment or abuse who need to document and organize evidence for reporting purposes.

**Core Use Scenarios**:
- Documenting workplace harassment incidents for HR reporting
- Organizing evidence of abuse for legal proceedings
- Preparing incident reports for institutional complaints
- Creating chronological records of recurring harassment patterns

## 3. Page Structure and Functionality

```
SafeProof Application
├── Registration Page
├── Login Page
├── Dashboard
│   ├── Case List
│   └── Create New Case
├── Case Detail Page
│   ├── Evidence Upload Section
│   ├── AI Analysis Results
│   ├── Timeline View
│   └── Report Generation
└── Report Download Page
```

### 3.1 Registration Page

User creates an account by providing email and password to access the application.

### 3.2 Login Page

User enters email and password to access their account and cases.

### 3.3 Dashboard

**Case List Section**:
- Display all cases created by the user
- Show case name and creation date for each case
- Provide access to individual case details

**Create New Case**:
- User inputs case name to create a new case
- System creates the case and navigates to Case Detail Page

### 3.4 Case Detail Page

**Evidence Upload Section**:
- User uploads evidence files: screenshots, images, PDFs, text documents
- Display uploaded evidence with file names
- Allow multiple file uploads

**AI Analysis Results**:
- Display AI-extracted events from uploaded evidence
- Show identified patterns and recurring behaviors

**Timeline View**:
- Present incidents in chronological order
- Display date, time, and event description for each incident

**Report Generation**:
- User triggers report generation
- AI creates a professional incident report based on analyzed evidence and timeline

### 3.5 Report Download Page

User downloads the generated professional incident report.

## 4. Business Rules and Logic

### 4.1 Evidence Processing Workflow

1. User uploads evidence files to a case
2. AI automatically analyzes uploaded evidence and extracts incident events
3. AI generates a chronological timeline based on extracted events
4. AI identifies patterns and recurring behaviors across incidents
5. AI creates a professional incident report incorporating timeline and patterns
6. User downloads the completed report

### 4.2 Case Management Rules

- Each user can create multiple cases
- Each case contains its own evidence, analysis, timeline, and report
- Cases are isolated from each other

### 4.3 AI Analysis Rules

- AI extracts date, time, and event details from evidence
- AI identifies recurring behaviors and patterns across multiple pieces of evidence
- AI organizes events chronologically in the timeline
- AI generates a professional report summarizing incidents, timeline, and patterns

### 4.4 Data Storage

Backend stores user account information, case data, uploaded evidence, AI analysis results, timelines, and generated reports.

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| User uploads unsupported file format | Display error message indicating supported formats |
| AI fails to extract events from evidence | Notify user that analysis could not be completed |
| No evidence uploaded in a case | Disable report generation until evidence is added |
| User attempts to download report before generation | Prompt user to generate report first |
| Login with incorrect credentials | Display error message indicating invalid email or password |
| Registration with existing email | Display error message indicating email already registered |

## 6. Acceptance Criteria

1. User registers an account with email and password
2. User logs in to access the dashboard
3. User creates a new case with a case name
4. User uploads multiple evidence files (screenshots, images, PDFs, text) to the case
5. AI automatically analyzes evidence and generates a chronological timeline
6. User views the timeline and AI-identified patterns
7. User generates a professional incident report
8. User downloads the completed report

## 7. Out of Scope for This Release

- Multi-language support
- Evidence editing or annotation tools
- Sharing cases or reports with third parties
- Integration with legal or HR systems
- Mobile application version
- Evidence encryption or advanced security features
- User profile customization
- Case collaboration with multiple users
- Evidence version control or history tracking
- Custom report templates
- Export formats other than the default report format
- Evidence search or filtering within cases
- Notifications or reminders
- Case archiving or deletion
- Password recovery or account management features