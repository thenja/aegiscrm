create extension if not exists pgcrypto;

create type public.user_role as enum ('Director', 'Team Lead', 'Team Member', 'Admin');
create type public.client_status as enum ('Active', 'Dormant', 'Prospect', 'Terminated');
create type public.engagement_type as enum ('IPO', 'Retainer', 'Ad Hoc', 'Annual Report', 'Event Only');
create type public.client_type as enum ('IPO Client', 'Listed Company Retainer', 'Monthly PR Retainer', 'Project-Only Client', 'Dormant Client');
create type public.market_type as enum ('Main', 'ACE', 'LEAP', 'Not Listed');
create type public.health_status as enum ('Healthy', 'At Risk', 'Critical');
create type public.servicing_frequency as enum ('2-3x Per Week', 'Weekly', 'Fortnightly', 'Monthly', 'As Needed');
create type public.deliverable_status as enum ('Not Started', 'In Progress', 'Pending Internal Review', 'Pending Client Approval', 'Pending External Party', 'At Risk', 'Overdue', 'Completed', 'Not Required This Month', 'Deferred', 'Pending Client Data', 'Cancelled', 'On Hold');
create type public.task_status as enum ('Not Started', 'In Progress', 'Pending Internal Review', 'Pending Client Approval', 'Pending External Party', 'At Risk', 'Overdue', 'Completed', 'Cancelled', 'On Hold');
create type public.priority_level as enum ('Critical', 'High', 'Medium', 'Low');
create type public.category_type as enum ('PR', 'IR', 'IPO', 'Annual Report', 'Event', 'Media', 'Investor Deck', 'Factsheet', 'Analyst Briefing', 'Other');
create type public.recurrence_type as enum ('Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annually', 'One-Off');
create type public.review_status as enum ('Pending Review', 'Approved', 'Returned for Amendment');
create type public.confirmation_status as enum ('Confirmed', 'Not Yet Confirmed', 'Not Required');
create type public.approval_type as enum ('Client', 'Sponsor', 'Adviser', 'Lawyer', 'Auditor', 'Printer', 'Other');
create type public.approval_status as enum ('Pending', 'Approved', 'Rejected', 'Superseded');
create type public.follow_up_tone as enum ('Gentle Reminder', 'Firm Follow-Up', 'Escalation');
create type public.comm_channel as enum ('WhatsApp', 'Email', 'Phone Call', 'Video Call', 'In-Person Meeting', 'Client Visit', 'Other');
create type public.comm_direction as enum ('Outbound', 'Inbound');
create type public.contact_type as enum ('Client', 'Sponsor', 'Adviser', 'Lawyer', 'Auditor', 'Printer', 'Banker', 'Other');
create type public.activity_type as enum ('Status Change', 'Creation', 'Approval', 'Assignment', 'Review', 'Key Date', 'System');
create type public.activity_ref_type as enum ('Deliverable', 'Task', 'Approval', 'Client', 'Key Date');
create type public.event_type as enum ('IPO Listing', 'Prospectus Launch', 'Quarterly Results', 'AGM', 'EGM', 'Annual Report Deadline', 'Analyst Briefing', 'Media Interview', 'Media Event', 'Signing Ceremony', 'Contract Renewal', 'Bursa Announcement', 'Other');
create type public.prep_status as enum ('Not Started', 'In Progress', 'Ready', 'Completed');
create type public.approval_reference_type as enum ('Deliverable', 'Task');
create type public.comm_reference_type as enum ('Deliverable', 'Task', 'Approval', 'None');

