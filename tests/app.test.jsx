import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';

beforeEach(() => {
  localStorage.clear();
});

describe('filter tabs', () => {
  it('shows counts per tab and filters the rendered list', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('New task'), 'Alpha{Enter}');
    await user.type(screen.getByLabelText('New task'), 'Beta{Enter}');

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    // Mark "Alpha" done via its checkbox.
    const alpha = within(list).getAllByRole('listitem')[0];
    await user.click(within(alpha).getByRole('checkbox'));

    const tabs = screen.getByRole('tablist');
    expect(within(tabs).getByRole('tab', { name: /All/ }).textContent).toBe('All2');
    expect(within(tabs).getByRole('tab', { name: /Active/ }).textContent).toBe('Active1');
    expect(within(tabs).getByRole('tab', { name: /Completed/ }).textContent).toBe('Completed1');

    await user.click(within(tabs).getByRole('tab', { name: /Active/ }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Beta')).toBeTruthy();

    await user.click(within(tabs).getByRole('tab', { name: /Completed/ }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Alpha')).toBeTruthy();

    await user.click(within(tabs).getByRole('tab', { name: /All/ }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('clear completed', () => {
  it('is disabled when nothing is done and removes done items when enabled', async () => {
    const user = userEvent.setup();
    render(<App />);

    const clear = screen.getByRole('button', { name: 'Clear completed' });
    expect(clear.disabled).toBe(true);

    await user.type(screen.getByLabelText('New task'), 'Alpha{Enter}');
    expect(clear.disabled).toBe(true);

    const list = screen.getByRole('list');
    await user.click(within(within(list).getAllByRole('listitem')[0]).getByRole('checkbox'));
    expect(clear.disabled).toBe(false);

    await user.click(clear);
    expect(within(list).queryAllByRole('listitem')).toHaveLength(0);
    expect(clear.disabled).toBe(true);
  });
});

describe('search', () => {
  it('filters by substring match on todo text', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('New task'), 'Buy milk{Enter}');
    await user.type(screen.getByLabelText('New task'), 'Walk dog{Enter}');
    await user.type(screen.getByLabelText('New task'), 'Milk the cow{Enter}');

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);

    await user.type(screen.getByLabelText('Search tasks'), 'milk');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await user.clear(screen.getByLabelText('Search tasks'));
    await user.type(screen.getByLabelText('Search tasks'), 'zzz');
    expect(within(list).queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText(/No tasks match/)).toBeTruthy();
  });
});

describe('priority', () => {
  it('cycles priority on click and renders a colored dot', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('New task'), 'Task{Enter}');
    const list = screen.getByRole('list');
    const item = within(list).getAllByRole('listitem')[0];

    const dot = within(item).getByRole('button', { name: /Priority:/ });
    expect(dot.getAttribute('title')).toContain('Medium');
    expect(dot.className).toContain('priority-med');

    await user.click(dot);
    expect(dot.getAttribute('title')).toContain('High');
    expect(dot.className).toContain('priority-high');

    await user.click(dot);
    expect(dot.getAttribute('title')).toContain('Low');
    expect(dot.className).toContain('priority-low');

    await user.click(dot);
    expect(dot.getAttribute('title')).toContain('Medium');
  });
});

describe('due dates', () => {
  it('flags overdue tasks red and due-today tasks amber', async () => {
    const user = userEvent.setup();
    render(<App />);

    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await user.type(screen.getByLabelText('New task'), 'Overdue task{Enter}');
    await user.type(screen.getByLabelText('New task'), 'Today task{Enter}');
    await user.type(screen.getByLabelText('New task'), 'Later task{Enter}');

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const dateInputs = items.map((i) => within(i).getByLabelText(/Due date for/));

    await user.type(dateInputs[0], iso(yesterday));
    await user.type(dateInputs[1], iso(today));
    await user.type(dateInputs[2], iso(tomorrow));

    expect(items[0].className).toContain('overdue');
    expect(within(items[0]).getByText('Overdue')).toBeTruthy();
    expect(items[1].className).toContain('today');
    expect(within(items[1]).getByText('Due today')).toBeTruthy();
    expect(items[2].className).not.toContain('overdue');
    expect(items[2].className).not.toContain('today');
  });
});

describe('persistence', () => {
  it('persists priority and due, and migrates legacy saved todos', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.type(screen.getByLabelText('New task'), 'Persisted{Enter}');
    const list = screen.getByRole('list');
    const item = within(list).getAllByRole('listitem')[0];
    await user.click(within(item).getByRole('button', { name: /Priority:/ }));
    await user.type(within(item).getByLabelText(/Due date for/), '2030-01-01');

    unmount();

    const saved = JSON.parse(localStorage.getItem('todos'));
    expect(saved[0].priority).toBe('high');
    expect(saved[0].due).toBe('2030-01-01');
    expect(saved[0].id).toBeTruthy();

    // Legacy shape: no priority, no due, no id.
    localStorage.setItem('todos', JSON.stringify([{ text: 'Legacy', done: false }]));
    render(<App />);
    const legacyItem = within(screen.getByRole('list')).getAllByRole('listitem')[0];
    expect(within(legacyItem).getByRole('button', { name: /Priority:/ }).getAttribute('title')).toContain(
      'Medium'
    );
    expect(within(legacyItem).getByLabelText(/Due date for/).value).toBe('');
  });
});
