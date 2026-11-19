import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { RoleCategorySelector } from '../components/common/RoleCategorySelector';
import { ROLE_CATEGORIES, ALL_SUGGESTED_ROLES } from '../constants/roleCategories';

describe('RoleCategorySelector Component Tests', () => {
  it('renders all 11 role category tabs and total role count', () => {
    render(
      <ThemeProvider>
        <RoleCategorySelector
          selectedRoles={['React Developer']}
          onAddRole={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(ROLE_CATEGORIES.length).toBe(11);
    expect(screen.getByText(/Browse Job Role Categories/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`All Roles \\(${ALL_SUGGESTED_ROLES.length}\\)`, 'i'))).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('AI & Data')).toBeInTheDocument();
    expect(screen.getByText('Cloud & DevOps')).toBeInTheDocument();
    expect(screen.getByText('Cybersecurity')).toBeInTheDocument();
  });

  it('filters roles when clicking a category tab', () => {
    render(
      <ThemeProvider>
        <RoleCategorySelector
          selectedRoles={[]}
          onAddRole={vi.fn()}
        />
      </ThemeProvider>
    );

    const mobileTab = screen.getByText('Mobile');
    fireEvent.click(mobileTab);

    expect(screen.getByText('React Native Developer')).toBeInTheDocument();
    expect(screen.getByText('Flutter Developer')).toBeInTheDocument();
    expect(screen.getByText('Android Developer')).toBeInTheDocument();
    expect(screen.getByText('iOS Developer')).toBeInTheDocument();
    expect(screen.queryByText('Full Stack Java Developer')).not.toBeInTheDocument();
  });

  it('calls onAddRole when clicking an unselected role chip', () => {
    const addSpy = vi.fn();
    render(
      <ThemeProvider>
        <RoleCategorySelector
          selectedRoles={[]}
          onAddRole={addSpy}
        />
      </ThemeProvider>
    );

    const devopsTab = screen.getByText('Cloud & DevOps');
    fireEvent.click(devopsTab);

    const roleBtn = screen.getByText('DevOps Engineer');
    fireEvent.click(roleBtn);

    expect(addSpy).toHaveBeenCalledWith('DevOps Engineer');
  });

  it('calls onRemoveRole when clicking an already selected role chip', () => {
    const removeSpy = vi.fn();
    render(
      <ThemeProvider>
        <RoleCategorySelector
          selectedRoles={['Python Developer']}
          onAddRole={vi.fn()}
          onRemoveRole={removeSpy}
        />
      </ThemeProvider>
    );

    const backendTab = screen.getByText('Backend');
    fireEvent.click(backendTab);

    const selectedBtn = screen.getByText('Python Developer');
    fireEvent.click(selectedBtn);

    expect(removeSpy).toHaveBeenCalledWith('Python Developer');
  });

  it('supports real-time search filtering across roles', () => {
    render(
      <ThemeProvider>
        <RoleCategorySelector
          selectedRoles={[]}
          onAddRole={vi.fn()}
        />
      </ThemeProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Filter roles/i);
    fireEvent.change(searchInput, { target: { value: 'Kubernetes' } });

    expect(screen.getByText('Kubernetes Platform Engineer')).toBeInTheDocument();
    expect(screen.queryByText('React Developer')).not.toBeInTheDocument();
  });

  it('adds all unselected roles in active category when clicking "+ Add All in ..."', () => {
    const addMultipleSpy = vi.fn();
    render(
      <ThemeProvider>
        <RoleCategorySelector
          selectedRoles={['React Developer']}
          onAddRole={vi.fn()}
          onAddMultipleRoles={addMultipleSpy}
        />
      </ThemeProvider>
    );

    const frontendTab = screen.getByText('Frontend');
    fireEvent.click(frontendTab);

    const addAllBtn = screen.getByText(/\+ Add All in Frontend/i);
    fireEvent.click(addAllBtn);

    expect(addMultipleSpy).toHaveBeenCalledTimes(1);
    const passedRoles = addMultipleSpy.mock.calls[0][0];
    expect(passedRoles).not.toContain('React Developer'); // Already selected
    expect(passedRoles).toContain('Next.js Developer');
    expect(passedRoles).toContain('TypeScript Developer');
  });
});
