# Property Route Optimizer - Test Documentation

## Test Suite Overview

This project includes comprehensive testing infrastructure for the Property Route Optimizer web application. The tests are designed to validate core functionality, performance, and user workflows.

## Test Categories

### 1. Unit Tests (`tests/utils.test.js`)
Tests for core utility functions:
- `parseParcelInput` - Input validation and parcel ID parsing
- `calculateRouteStats` - Route statistics calculations
- `transformRoutesForExport` - Data transformation for CSV export
- `generateCSV` - CSV generation functionality
- `validateApiResponse` - API response validation
- `formatErrorMessage` - Error message formatting

### 2. DOM Integration Tests (`tests/dom.test.js`)
Tests for DOM manipulation and UI interactions:
- Element interaction and state management
- Results display and rendering
- Map container management
- Control panel functionality
- Button state transitions
- Responsive design elements

### 3. API Integration Tests (`tests/api.test.js`)
Tests for API communication:
- Request structure validation
- Response handling (success and error cases)
- Network error scenarios
- Rate limiting and performance
- CORS and timeout handling

### 4. Performance Tests (`tests/performance.test.js`)
Tests for performance optimization:
- Large dataset handling
- Memory usage optimization
- Edge case performance
- Concurrent operation handling
- Function optimization benchmarks

### 5. End-to-End Integration Tests (`tests/e2e.test.js`)
Tests for complete user workflows:
- Complete successful workflow from input to export
- Error recovery scenarios
- Map type switching
- Export functionality
- UI state management
- Field mode integration

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage
Current coverage focuses on testable utility functions. The main areas covered include:
- Input validation and parsing
- Data transformation and export
- API response validation
- Error handling
- Performance optimization

## Test Configuration

### Jest Configuration
The project uses Jest with jsdom environment for DOM testing:
- **Test Environment**: jsdom (for DOM manipulation)
- **Setup File**: `tests/setup.js` (mock configuration)
- **Test Pattern**: `tests/**/*.test.js`
- **Coverage**: Configured for `scripts-testable.js`

### Mocking Strategy
- **Fetch API**: Mocked for API testing
- **DOM APIs**: Mocked for file download and URL operations
- **Performance**: Real performance timing for benchmarks

## Best Practices

### Writing New Tests
1. **Follow Naming Convention**: Describe what the test does clearly
2. **Use Setup/Teardown**: Clean up between tests using `beforeEach`
3. **Mock External Dependencies**: Use mocks for API calls and file operations
4. **Test Edge Cases**: Include empty, null, and invalid inputs
5. **Performance Awareness**: Use performance timing for optimization tests

### Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Keep tests focused on single functionality
- Include both positive and negative test cases

## Continuous Testing

### Watch Mode
Use `npm run test:watch` during development to automatically run tests when files change.

### Coverage Goals
- **Functions**: Aim for >80% coverage of utility functions
- **Branches**: Test all conditional logic paths
- **Edge Cases**: Handle empty, invalid, and boundary conditions

## Performance Benchmarks

The performance tests establish baseline expectations:
- **Large Input Parsing**: <100ms for 1000 parcels
- **Route Calculations**: <50ms for 100 routes with 20 stops each
- **CSV Generation**: <200ms for 2000 records
- **Memory Usage**: <10MB increase for repeated operations

## Future Enhancements

### Potential Additions
1. **Visual Regression Tests**: Screenshot comparisons for UI changes
2. **Integration with CI/CD**: Automated testing on code changes
3. **Load Testing**: Stress testing with extremely large datasets
4. **Browser Compatibility**: Cross-browser testing with Playwright
5. **Accessibility Testing**: Screen reader and keyboard navigation tests

### Test Data Management
Consider creating fixture files for:
- Sample API responses
- Large dataset generators
- Mock map HTML content

## Troubleshooting

### Common Issues
1. **jsdom Errors**: Ensure jest-environment-jsdom is installed
2. **Mock Failures**: Clear mocks between tests using `beforeEach`
3. **Performance Variance**: Run performance tests multiple times for accuracy
4. **Coverage Reports**: Ensure coverage is configured for correct files

### Debugging Tests
- Use `console.log` for debugging test values
- Run single tests with `npm test -- --testNamePattern="test name"`
- Use Jest's `--verbose` flag for detailed output