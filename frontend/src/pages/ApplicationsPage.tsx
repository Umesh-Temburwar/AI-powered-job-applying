import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Briefcase,
  Building,
  MapPin,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useApplications } from '../hooks/useApplications';
import { useToast } from '../context/ToastContext';
import {
  Card,
  CardHeader,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  EmptyState,
  Skeleton,
} from '../components/ui';
import type { Application, PlatformName, ApplicationStatus } from '../types';

export const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    applications,
    total,
    totalPages,
    page,
    setPage,
    filters,
    updateFilters,
    loading,
    error,
    exportCsv,
  } = useApplications({ page: 1, pageSize: 8 });

  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState(filters.query || '');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ query: searchQuery });
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const csvData = await exportCsv();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `universal_job_applications_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Exported applications to CSV', 'success');
    } catch (err) {
      showToast('Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadgeVariant = (status: ApplicationStatus) => {
    switch (status) {
      case 'applied':
        return 'success';
      case 'interview':
        return 'cyan';
      case 'review_needed':
        return 'warning';
      case 'under_review':
        return 'info';
      case 'rejected':
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Sample Data Disclaimer */}
      <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/40 text-sky-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Application records live-sync across Supabase Cloud CRM, your multi-platform automation bots, and CSV exports.
          </span>
        </div>
        <Badge variant="cyan" size="sm">
          CRM Tracker
        </Badge>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <Card>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, company, or city..."
              leftIcon={<Search className="w-4 h-4" />}
            />
            <Button type="submit" variant="secondary" size="md">
              Search
            </Button>
          </form>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-36">
              <Select
                value={filters.platform || 'All'}
                onChange={(e) => updateFilters({ platform: e.target.value as PlatformName | 'All' })}
                options={[
                  { value: 'All', label: 'All Portals' },
                  { value: 'Naukri', label: 'Naukri' },
                  { value: 'Internshala', label: 'Internshala' },
                  { value: 'Indeed', label: 'Indeed' },
                  { value: 'LinkedIn', label: 'LinkedIn' },
                  { value: 'Glassdoor', label: 'Glassdoor' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={filters.status || 'All'}
                onChange={(e) => updateFilters({ status: e.target.value as ApplicationStatus | 'All' })}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'applied', label: 'Applied' },
                  { value: 'interview', label: 'Interview' },
                  { value: 'review_needed', label: 'Review Needed' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleExportCsv}
              isLoading={exporting}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Table Card (Desktop) & Cards List (Mobile) */}
      <Card className="overflow-hidden p-0">
        <div className="p-5 border-b border-theme flex items-center justify-between">
          <CardHeader
            title="Logged Applications"
            subtitle={`Showing ${applications.length} of ${total} records`}
            className="mb-0"
          />
          <span className="text-xs text-theme-muted font-mono">
            Page {page} of {totalPages}
          </span>
        </div>

        {loading && applications.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
            <Skeleton height="3rem" />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8">
            {total === 0 && !filters.query && (!filters.platform || filters.platform === 'All') && (!filters.status || filters.status === 'All') ? (
              <EmptyState
                icon={<Briefcase className="w-6 h-6" />}
                title="You haven't recorded any job applications yet"
                description="When your background automation tasks apply to jobs or you record applications, they will appear in this tracker."
                actionLabel="Configure Job Preferences"
                onAction={() => navigate('/preferences')}
              />
            ) : (
              <EmptyState
                icon={<Briefcase className="w-6 h-6" />}
                title="No Applications Match Filters"
                description="Try adjusting your keyword query, portal selection, or status filters."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearchQuery('');
                  updateFilters({ query: '', platform: 'All', status: 'All' });
                }}
              />
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-theme bg-theme-surface/50 text-xs font-semibold text-theme-secondary uppercase tracking-wider">
                    <th className="py-3.5 px-5">Role & Company</th>
                    <th className="py-3.5 px-4">Portal</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Salary</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="hover:bg-theme-card-hover transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <p className="font-bold text-theme-primary group-hover:text-[var(--accent)] transition-colors">
                          {app.jobTitle}
                        </p>
                        <p className="text-xs text-theme-secondary flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          {app.company}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant="cyan" size="sm">
                          {app.platform}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-xs text-theme-secondary">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-theme-muted" />
                          {app.location}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-theme-secondary font-mono">
                        {app.salary || 'Not specified'}
                      </td>

                      <td className="py-4 px-4">
                        <Badge variant={getStatusBadgeVariant(app.status)} size="sm">
                          {app.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-xs text-theme-muted whitespace-nowrap">
                        {new Date(app.appliedDate).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                          }}
                          aria-label="View application details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-theme">
              {applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className="p-4 space-y-2 hover:bg-theme-card-hover cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-theme-primary">{app.jobTitle}</h4>
                      <p className="text-xs text-theme-secondary flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3" />
                        {app.company}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(app.status)} size="sm">
                      {app.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-theme-muted pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {app.location}
                    </span>
                    <Badge variant="default" size="sm">
                      {app.platform}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-theme bg-theme-surface/30 flex items-center justify-between">
              <span className="text-xs text-theme-muted">
                Showing page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Application Details Drawer Modal */}
      <Modal
        isOpen={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
        title="Application Details"
        maxWidth="lg"
        footer={
          <>
            {selectedApp?.url && (
              <a
                href={selectedApp.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Original Listing
                </Button>
              </a>
            )}
            <Button variant="primary" size="sm" onClick={() => setSelectedApp(null)}>
              Close
            </Button>
          </>
        }
      >
        {selectedApp && (
          <div className="space-y-5 text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-theme pb-4">
              <div>
                <h3 className="text-lg font-bold text-theme-primary">{selectedApp.jobTitle}</h3>
                <p className="text-sm text-theme-secondary font-medium mt-0.5">
                  {selectedApp.company}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedApp.status)} size="md">
                {selectedApp.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Platform</span>
                <span className="font-semibold text-theme-primary">{selectedApp.platform}</span>
              </div>
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Location</span>
                <span className="font-semibold text-theme-primary">{selectedApp.location}</span>
              </div>
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Salary Range</span>
                <span className="font-semibold text-theme-primary font-mono">
                  {selectedApp.salary || 'Not specified'}
                </span>
              </div>
              <div className="p-3 bg-theme-surface rounded-xl">
                <span className="text-theme-muted block mb-1">Applied Timestamp</span>
                <span className="font-semibold text-theme-primary">
                  {new Date(selectedApp.appliedDate).toLocaleString()}
                </span>
              </div>
            </div>

            {selectedApp.notes && (
              <div className="p-3.5 bg-theme-surface rounded-xl">
                <span className="text-xs font-semibold text-theme-secondary uppercase tracking-wider block mb-1">
                  Submission Notes
                </span>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  {selectedApp.notes}
                </p>
              </div>
            )}

            {selectedApp.errorMessage && (
              <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200">
                <span className="font-bold block mb-1 flex items-center gap-1.5 text-red-300">
                  <AlertCircle className="w-3.5 h-3.5" /> Portal Notice / Error Details
                </span>
                <p>{selectedApp.errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
