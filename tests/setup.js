// Jest setup file for DOM testing
require('@testing-library/jest-dom');

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL for blob tests
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement for link testing
const originalCreateElement = document.createElement;
document.createElement = jest.fn().mockImplementation((tagName) => {
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: jest.fn(),
      ...originalCreateElement.call(document, tagName)
    };
  }
  return originalCreateElement.call(document, tagName);
});

// Setup DOM environment
beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  fetch.mockClear();
});