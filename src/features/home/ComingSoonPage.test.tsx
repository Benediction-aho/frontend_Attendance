import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ComingSoonPage } from './ComingSoonPage';

describe('ComingSoonPage', () => {
  it('shows the app name and keeps the logo', () => {
    render(
      <MemoryRouter>
        <ComingSoonPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: 'Assistance Ghana Attendance' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Assistance Ghana')).toBeInTheDocument();
  });
});
