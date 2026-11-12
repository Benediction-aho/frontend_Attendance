import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Switch } from './Switch';
import { Modal } from './Modal';
import { Stepper } from './Stepper';

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
