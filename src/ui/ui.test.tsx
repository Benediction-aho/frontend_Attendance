import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Switch } from './Switch';
import { Modal } from './Modal';
import { Stepper } from './Stepper';
import { Logo } from './Logo';

describe('design system', () => {
  it('button shows a busy state and blocks clicks while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const b = screen.getByRole('button');
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute('aria-busy', 'true');
  });
  it('danger-ghost button is red, never the primary link colour', () => {
    render(<Button variant="danger-ghost">Delete account</Button>);
    const b = screen.getByRole('button', { name: 'Delete account' });
    expect(b.className).toContain('text-danger-700');
    expect(b.className).not.toContain('text-primary-700');
  });
  it('disabled (not loading) buttons use the neutral disabled look', () => {
    render(<Button disabled>Save changes</Button>);
    const b = screen.getByRole('button', { name: 'Save changes' });
    expect(b).toBeDisabled();
    expect(b.className).toContain('bg-ink-100');
    expect(b.className).not.toContain('bg-primary-600');
  });
  it('loading keeps the variant colour', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button').className).toContain('bg-primary-600');
  });
  it('logo uses the cropped transparent asset for each place', () => {
    const { rerender } = render(<Logo variant="sidebar" />);
    expect(screen.getByRole('img', { name: 'Assistance Ghana' })).toHaveAttribute(
      'src',
      '/brand/logo-sidebar.png',
    );
    rerender(<Logo variant="topbar" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/brand/logo-topbar.png');
  });
  it('switch toggles and exposes its state', () => {
    const onChange = vi.fn();
    render(<Switch label="Face ID" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Face ID' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it('modal closes on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm" />);
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
  it('stepper marks the current step', () => {
    render(<Stepper steps={['One', 'Two']} current={1} />);
    expect(screen.getByText('Two').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});
