# Contributing to StockVision Pro

Thank you for your interest in contributing to StockVision Pro! To maintain high code quality and consistency, please follow these guidelines.

## 🚀 Setup and Development Workflow

### Prerequisites
- **Node.js**: 18+ (for frontend)
- **Python**: 3.10+ (for backend)
- **Docker**: For containerized database/app environment setup

### Local Setup
Refer to the [README.md](README.md) for full instructions on setting up local virtual environments and database connection strings.

### Running Backend Tests
To run backend integration tests, use the virtual environment's Python interpreter:
```bash
cd backend
# Windows:
venv\Scripts\python.exe test_integration.py

# Mac/Linux:
source venv/bin/activate
python test_integration.py
```

## 🛠️ Code Guidelines

### 1. Git & Commit Messages
We follow the **Conventional Commits** specification. Commit messages should be structured as follows:
- `feat: ...` for new features
- `fix: ...` for bug fixes
- `docs: ...` for documentation updates
- `refactor: ...` for code refactoring (without functional changes)
- `chore: ...` for repository housekeeping and tooling configuration

### 2. Typing Safety
- **Frontend (React)**: Avoid using `any` types. Strongly type props, callbacks, and state elements to leverage Vite + React compilation safety.
- **Backend (FastAPI)**: Keep functions type-hinted and use Pydantic models for data validation.

### 3. Styling Discipline
- Avoid using utility styling frameworks unless explicitly requested. Custom layout and page styling should be done using **Vanilla CSS** to leverage direct theme control and CSS custom properties.

---
*For any major feature proposals, please open an issue first to discuss the design details.*
