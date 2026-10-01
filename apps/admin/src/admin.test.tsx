import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { StatusBadge } from './components/StatusBadge';
import { ApiError, errorMessage } from './lib/api';

describe('admin app', () => {
  it('refuses to run without its public configuration', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/Configuration manquante/)).toBeTruthy();
  });

  it('labels every donation status', () => {
    render(<StatusBadge status="submitted" />);
    expect(screen.getByText('À vérifier')).toBeTruthy();
  });

  it('explains the self-review rule enforced by the API', () => {
    expect(errorMessage(new ApiError(403, 'cannot_review_own_donation'))).toMatch(/propre don/);
    expect(errorMessage(new ApiError(500, 'something_else'))).toBe('Erreur (something_else).');
  });
});
