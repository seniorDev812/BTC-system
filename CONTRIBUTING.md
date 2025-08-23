# Contributing to BTC Options Simulator

Thank you for your interest in contributing to the BTC Options & Futures Simulator! This document provides guidelines and information for contributors.

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/btc-options-simulator.git
   cd btc-options-simulator
   ```
3. **Install dependencies**
   ```bash
   npm run install-all
   ```
4. **Set up environment variables**
   - Copy `backend/env.example` to `backend/.env`
   - Add your Delta Exchange API credentials

## 🛠️ Development

### Running the Application
```bash
npm run dev
```

This starts both the backend server (port 5000) and frontend development server (port 3000).

### Project Structure
- `backend/` - Node.js server and API
- `frontend/` - React.js application
- `backend/services/` - Business logic and external API integration
- `frontend/src/components/` - React components

## 📝 Making Changes

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and small

### Testing
- Test your changes thoroughly
- Ensure the application runs without errors
- Test on both desktop and mobile devices

### Commit Messages
Use clear, descriptive commit messages:
```
feat: add new strategy builder feature
fix: resolve WebSocket connection issues
docs: update README with new installation steps
```

## 🔧 Common Development Tasks

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit a pull request

### Fixing Bugs
1. Create bug fix branch: `git checkout -b fix/bug-description`
2. Identify and fix the issue
3. Add tests if applicable
4. Submit a pull request

### Updating Dependencies
1. Update package.json files
2. Test thoroughly after updates
3. Update documentation if needed

## 📋 Pull Request Guidelines

1. **Title**: Clear, descriptive title
2. **Description**: Explain what changes were made and why
3. **Testing**: Describe how you tested your changes
4. **Screenshots**: Include screenshots for UI changes
5. **Breaking Changes**: Note any breaking changes

## 🐛 Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Console errors (if any)

## 📚 Documentation

- Keep README.md updated
- Document new features
- Update API documentation if needed
- Add inline comments for complex code

## 🤝 Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the project's coding standards

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to BTC Options Simulator! 🎉
