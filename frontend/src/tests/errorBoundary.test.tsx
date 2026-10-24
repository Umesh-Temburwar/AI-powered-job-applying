import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test exploded');
};

describe('ErrorBoundary component', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeTruthy();
  });

  it('renders fallback error alert when child throws', () => {
    // Suppress console.error during expected throw
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackTitle="Custom error title">
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error title')).toBeTruthy();
    expect(screen.getByText('Test exploded')).toBeTruthy();

    spy.mockRestore();
  });
});
