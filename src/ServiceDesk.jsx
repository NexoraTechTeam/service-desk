import React, { useState } from "react";
import {
  Search, Sparkles, Home, LayoutGrid, ClipboardList, CalendarDays,
  CheckSquare, BookOpen, Bell, LogOut, ChevronRight,
  ChevronDown, Plus, Users, Car, Wrench, Laptop, KeyRound,
  ShieldCheck, FileText, Package, HelpCircle, X, Check, ArrowRight,
  ArrowLeft, Paperclip, AlertTriangle, CheckCircle2, Circle,
  Loader2, ThumbsUp, ThumbsDown, Info, BarChart3, SlidersHorizontal,
  TrendingUp, TrendingDown, Pencil, FileSearch, FileLock2, Scale,
  Receipt, Banknote, Wallet, ShoppingCart, Handshake, ShieldAlert,
  Lock, EyeOff, Trash2, Copy,
} from "lucide-react";

/* ----------------------------------------------------------------------
   SAMPLE TENANT DATA — Nusantara Digital Group (fictional demo tenant)
---------------------------------------------------------------------- */

const TENANT_NAME = "Nusantara Digital Group";
const PRODUCT_NAME = "NexServe";

const CURRENT_USER = {
  name: "Bima Saputra",
  title: "Product Analyst",
  dept: "Digital Products",
  location: "Jakarta HQ",
  initials: "BS",
};

const MANAGER_USER = {
  name: "Rangga Pratama",
  title: "Engineering Manager",
  dept: "Digital Products",
  location: "Jakarta HQ",
  initials: "RP",
};

// Agent Workspace no longer has one fixed identity. These are the two
// seeded agents used to demonstrate the production access model below:
// Dewi is a single-team agent, Rina is a multi-team specialist.
const AGENT_IDENTITIES = [
  { name: "Dewi Anjani", title: "Legal Service Agent", dept: "Legal", location: "Jakarta HQ", initials: "DA" },
  { name: "Rina Wulandari", title: "Privacy & Vendor Risk Agent", dept: "Security & Privacy", location: "Jakarta HQ", initials: "RW" },
];

// Teams are the organizational/operational unit that fulfills work. A team
// owns one or more Assignment Groups (the actual routing target already
// stored on each service). This is what lets one team span services from
// more than one domain, and lets one domain be served by several teams.
const TEAMS = [
  { id: "team-it", name: "IT Service Desk Team", domain: "IT", assignmentGroups: ["IT Service Desk", "IT Asset Team", "IT Procurement"] },
  { id: "team-ga", name: "GA Team", domain: "GA", assignmentGroups: ["GA Facilities", "GA Fleet Team"] },
  { id: "team-hr", name: "HR Team", domain: "HR", assignmentGroups: ["HR Service Team"] },
  { id: "team-legal", name: "Legal Team", domain: "Legal", assignmentGroups: ["Legal Contracts", "Legal Advisory"] },
  { id: "team-finance", name: "Finance Team", domain: "Finance", assignmentGroups: ["Finance Shared Services"] },
  { id: "team-procurement", name: "Procurement Team", domain: "Procurement", assignmentGroups: ["Procurement Team"] },
  { id: "team-secops", name: "Security Operations Team", domain: "Security & Privacy", assignmentGroups: ["Security Operations"] },
  { id: "team-privacy", name: "Privacy Team", domain: "Security & Privacy", assignmentGroups: ["Privacy Review"] },
  { id: "team-vendor-risk", name: "Vendor Risk Team", domain: "Security & Privacy", assignmentGroups: ["Third-Party Security Review"] },
];

// The actual authorization source for Agent Workspace: User -> Team ->
// role-in-team -> effective dates. There is no free "pick any team"
// dropdown anymore — a signed-in identity can only ever see teams that
// show up here, and only while their membership is currently active.
// Dewi's IT membership below is deliberately expired, to demonstrate that
// lapsed access is excluded automatically rather than merely hidden.
const TEAM_MEMBERSHIPS_SEED = [
  { user: "Dewi Anjani", teamId: "team-it", roleInTeam: "Agent", effectiveFrom: "2025-01-01", effectiveUntil: "2025-12-31" },
  { user: "Dewi Anjani", teamId: "team-legal", roleInTeam: "Agent", effectiveFrom: "2026-01-01", effectiveUntil: null },
  { user: "Rina Wulandari", teamId: "team-privacy", roleInTeam: "Agent", effectiveFrom: "2026-02-01", effectiveUntil: null },
  { user: "Rina Wulandari", teamId: "team-vendor-risk", roleInTeam: "Agent", effectiveFrom: "2026-02-01", effectiveUntil: null },
  // Baseline staffing for the remaining teams, so the one gap the
  // Manager Dashboard's coverage analysis surfaces (IT Service Desk Team,
  // below) is a real, singular finding rather than every unstaffed team
  // seed data happened not to cover.
  { user: "Siti Rahayu", teamId: "team-ga", roleInTeam: "Agent", effectiveFrom: "2025-01-01", effectiveUntil: null },
  { user: "Budi Santoso", teamId: "team-hr", roleInTeam: "Agent", effectiveFrom: "2025-01-01", effectiveUntil: null },
  { user: "Maya Kartika", teamId: "team-finance", roleInTeam: "Agent", effectiveFrom: "2025-01-01", effectiveUntil: null },
  { user: "Agus Pranoto", teamId: "team-procurement", roleInTeam: "Agent", effectiveFrom: "2025-01-01", effectiveUntil: null },
  { user: "Hendra Wibowo", teamId: "team-secops", roleInTeam: "Agent", effectiveFrom: "2025-01-01", effectiveUntil: null },
];

function isMembershipActive(m, asOfIso) {
  return m.effectiveFrom <= asOfIso && (!m.effectiveUntil || m.effectiveUntil >= asOfIso);
}

// Given the live memberships array (state, since Admin can add to it) and
// a user name, return only the teams they are authorized for right now.
function getAuthorizedTeams(userName, memberships) {
  const todayIso = new Date().toISOString().slice(0, 10);
  return memberships
    .filter((m) => m.user === userName && isMembershipActive(m, todayIso))
    .map((m) => ({ ...TEAMS.find((t) => t.id === m.teamId), roleInTeam: m.roleInTeam }))
    .filter((t) => t.id);
}

const ADMIN_USER = {
  name: "Yudi Kurniawan",
  title: "System Administrator",
  dept: "IT Operations",
  location: "Jakarta HQ",
  initials: "YK",
};

const REQUESTER_INFO = {
  "Bima Saputra": { dept: "Digital Products", title: "Product Analyst" },
  "Sri Handayani": { dept: "Marketing", title: "Marketing Executive" },
  "Fajar Nugroho": { dept: "Finance & Accounting", title: "Finance Analyst" },
};

const KNOWN_DEPARTMENTS = ["Digital Products", "Marketing", "Finance & Accounting", "IT Operations", "Legal", "General Affairs"];

/* ----------------------------------------------------------------------
   ICON PALETTE — used by the Service Builder's icon picker. Every
   catalog and template service is drawn from this same fixed set.
---------------------------------------------------------------------- */

const ICON_CHOICES = [
  { key: "alert", label: "Incident / Alert", icon: AlertTriangle },
  { key: "laptop", label: "Device", icon: Laptop },
  { key: "key", label: "License / Key", icon: KeyRound },
  { key: "shield", label: "Access / Security", icon: ShieldCheck },
  { key: "shield-alert", label: "Security Incident", icon: ShieldAlert },
  { key: "lock", label: "Restricted Access", icon: Lock },
  { key: "eye-off", label: "Privacy", icon: EyeOff },
  { key: "users", label: "People / Room", icon: Users },
  { key: "car", label: "Vehicle / Travel", icon: Car },
  { key: "wrench", label: "Maintenance", icon: Wrench },
  { key: "package", label: "Supplies / Asset", icon: Package },
  { key: "help", label: "Inquiry", icon: HelpCircle },
  { key: "file-search", label: "Review", icon: FileSearch },
  { key: "file-lock", label: "Confidential Document", icon: FileLock2 },
  { key: "scale", label: "Legal / Governance", icon: Scale },
  { key: "receipt", label: "Expense", icon: Receipt },
  { key: "banknote", label: "Payment", icon: Banknote },
  { key: "wallet", label: "Budget", icon: Wallet },
  { key: "cart", label: "Purchase", icon: ShoppingCart },
  { key: "handshake", label: "Vendor / Partner", icon: Handshake },
  { key: "filetext", label: "Document / Letter", icon: FileText },
];

function iconByKey(key) {
  const match = ICON_CHOICES.find((i) => i.key === key);
  return match ? match.icon : FileText;
}

/* ----------------------------------------------------------------------
   LIVE SERVICE CATALOG — Wave 1 (IT, HR, GA) + Wave 2 (Legal, Finance,
   Procurement, Security & Privacy). This is now application state at
   runtime (see App below), not a fixed constant — this array is only
   the tenant's starting seed data. Every field here is exactly what the
   Service Builder form edits, so nothing about a service is special
   just because it shipped as seed data instead of being created later.
---------------------------------------------------------------------- */

const INITIAL_SERVICES = [
  {
    id: "it-incident", name: "IT Incident", domain: "IT", category: "Support",
    description: "Report a problem with your device, network, or a business application.",
    icon: AlertTriangle,
    formFields: [
      { name: "category", label: "Category", type: "select", options: ["Network", "Hardware", "Software", "Account & Access", "Other"] },
      { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { name: "description", label: "Describe the issue", type: "textarea" },
    ],
    recordType: "Incident",
    approvalRequired: false, approverType: "None",
    assignmentGroup: "IT Service Desk",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "laptop-request", name: "Laptop / Device Request", domain: "IT", category: "Hardware",
    description: "Request a new or replacement laptop, monitor, or peripheral.",
    icon: Laptop,
    formFields: [
      { name: "requestType", label: "Request Type", type: "select", options: ["New Laptop", "Replacement Laptop", "Peripheral"] },
      { name: "reason", label: "Reason", type: "textarea" },
      { name: "urgency", label: "Urgency", type: "select", options: ["Standard", "Urgent"] },
    ],
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager",
    assignmentGroup: "IT Asset Team",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "software-request", name: "Software / License Request", domain: "IT", category: "Software",
    description: "Request a new software license or application access.",
    icon: KeyRound,
    formFields: [
      { name: "softwareName", label: "Software / License Name", type: "text" },
      { name: "businessJustification", label: "Business Justification", type: "textarea" },
      { name: "estimatedCost", label: "Estimated Cost (IDR)", type: "text" },
    ],
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager + IT",
    assignmentGroup: "IT Procurement",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "system-access", name: "System Access Request", domain: "IT", category: "Access",
    description: "Request access to an internal application, system, or dataset.",
    icon: ShieldCheck,
    formFields: [
      { name: "application", label: "Application / System", type: "text" },
      { name: "accessLevel", label: "Access Level Requested", type: "select", options: ["Read Only", "Standard User", "Administrator"] },
      { name: "justification", label: "Justification", type: "textarea" },
    ],
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager + IT + Data Owner",
    assignmentGroup: "IT Service Desk",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "meeting-room", name: "Meeting Room Booking", domain: "GA", category: "Workplace",
    description: "Reserve a meeting room for a discussion, interview, or workshop.",
    icon: Users,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: false, approverType: "Above 10 seats only",
    assignmentGroup: "GA Facilities",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: false,
    requiresResource: true, resourceType: "Meeting Room",
    status: "published",
  },
  {
    id: "vehicle", name: "Company Vehicle Booking", domain: "GA", category: "Workplace",
    description: "Book a company vehicle and driver for a business trip.",
    icon: Car,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager + GA",
    assignmentGroup: "GA Fleet Team",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: true, resourceType: "Vehicle",
    status: "published",
  },
  {
    id: "facility-maintenance", name: "Facility Maintenance", domain: "GA", category: "Facilities",
    description: "Report a facility issue such as air conditioning, plumbing, or electrical.",
    icon: Wrench,
    formFields: [
      { name: "location", label: "Location", type: "text" },
      { name: "description", label: "Describe the issue", type: "textarea" },
      { name: "urgency", label: "Urgency", type: "select", options: ["Low", "Medium", "High"] },
    ],
    recordType: "Incident",
    approvalRequired: false, approverType: "Above cost threshold only",
    assignmentGroup: "GA Facilities",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "office-supplies", name: "Office Supplies Request", domain: "GA", category: "Facilities",
    description: "Request stationery, printer supplies, or other consumables.",
    icon: Package,
    formFields: [
      { name: "item", label: "Item", type: "text" },
      { name: "quantity", label: "Quantity", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager",
    assignmentGroup: "GA Facilities",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "employment-letter", name: "HR Employment Letter", domain: "HR", category: "Employee Documents",
    description: "Request an employment verification or reference letter.",
    icon: FileText,
    formFields: [
      { name: "purpose", label: "Purpose", type: "select", options: ["Visa Application", "Bank Reference", "Loan Application", "Other"] },
      { name: "language", label: "Language", type: "select", options: ["English", "Indonesian"] },
      { name: "notes", label: "Additional Notes", type: "textarea" },
    ],
    recordType: "Service Request",
    approvalRequired: true, approverType: "HR",
    assignmentGroup: "HR Service Team",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "hr-inquiry", name: "HR Inquiry", domain: "HR", category: "Employee Support",
    description: "Ask a question about leave, payroll, benefits, or HR policy.",
    icon: HelpCircle,
    formFields: [
      { name: "topic", label: "Topic", type: "select", options: ["Leave Balance", "Payroll", "Benefits", "Policy Question", "Other"] },
      { name: "description", label: "Your Question", type: "textarea" },
    ],
    recordType: "Service Request",
    approvalRequired: false, approverType: "None",
    assignmentGroup: "HR Service Team",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "contract-review", name: "Contract Review", domain: "Legal", category: "Contracts",
    description: "Request legal review of a customer, vendor, or partner contract.",
    icon: FileSearch,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Legal",
    assignmentGroup: "Legal Contracts",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "nda-request", name: "NDA Request", domain: "Legal", category: "Contracts",
    description: "Request a mutual or one-way NDA to be prepared and reviewed.",
    icon: FileLock2,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Legal",
    assignmentGroup: "Legal Contracts",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "legal-advice", name: "Legal Advice", domain: "Legal", category: "Advisory",
    description: "Get internal legal consultation on a business question or decision.",
    icon: Scale,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: false, approverType: "None",
    assignmentGroup: "Legal Advisory",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "reimbursement", name: "Reimbursement", domain: "Finance", category: "Expense",
    description: "Submit an employee expense for reimbursement.",
    icon: Receipt,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager + Finance",
    assignmentGroup: "Finance Shared Services",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "payment-request", name: "Payment Request", domain: "Finance", category: "Payments",
    description: "Request payment to a vendor or third party.",
    icon: Banknote,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Finance",
    assignmentGroup: "Finance Shared Services",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "budget-request", name: "Budget Request", domain: "Finance", category: "Budget",
    description: "Request a new or additional budget allocation.",
    icon: Wallet,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager + Finance",
    assignmentGroup: "Finance Shared Services",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "purchase-request", name: "Purchase Request", domain: "Procurement", category: "Sourcing",
    description: "Request the purchase of goods or services.",
    icon: ShoppingCart,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Manager + Procurement",
    assignmentGroup: "Procurement Team",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "vendor-onboarding", name: "Vendor Onboarding", domain: "Procurement", category: "Vendor Management",
    description: "Create a new vendor, including due diligence.",
    icon: Handshake,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Procurement",
    assignmentGroup: "Procurement Team",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "rfq-sourcing", name: "RFQ / Sourcing", domain: "Procurement", category: "Sourcing",
    description: "Request competitive sourcing or a request for quotation.",
    icon: ClipboardList,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: false, approverType: "None",
    assignmentGroup: "Procurement Team",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "security-incident", name: "Security Incident", domain: "Security & Privacy", category: "Incident",
    description: "Report a suspected information security incident.",
    icon: ShieldAlert,
    formFields: null,
    recordType: "Incident",
    approvalRequired: false, approverType: "None",
    assignmentGroup: "Security Operations",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "security-access-review", name: "Security Access Review", domain: "Security & Privacy", category: "Access",
    description: "Request a review of privileged or sensitive access.",
    icon: Lock,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Security",
    assignmentGroup: "Security Operations",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "privacy-inquiry", name: "Privacy Inquiry", domain: "Security & Privacy", category: "Privacy",
    description: "Ask a question about data privacy or personal data handling.",
    icon: EyeOff,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: false, approverType: "None",
    assignmentGroup: "Privacy Review",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "vendor-security-review", name: "Vendor Security Review", domain: "Security & Privacy", category: "Vendor Risk",
    description: "Third-party security assessment for a new or existing vendor.",
    icon: ShieldAlert,
    formFields: null,
    recordType: "Service Request",
    approvalRequired: true, approverType: "Security",
    assignmentGroup: "Third-Party Security Review",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
  {
    id: "document-review-signoff", name: "Document Review & Sign-off", domain: "Legal", category: "Document Review",
    description: "Route a document for legal review or Board of Directors sign-off — link where it's stored or attach it directly.",
    icon: FileSearch,
    formFields: [
      { name: "documentTitle", label: "Document Title", type: "text" },
      { name: "reviewerType", label: "Reviewer", type: "select", options: ["Legal Review", "Board of Directors Sign-off", "Department Head Approval"] },
      { name: "documentLink", label: "Document Link (Google Drive, SharePoint, etc.)", type: "link" },
      { name: "notes", label: "Notes for the Reviewer", type: "textarea" },
    ],
    recordType: "Service Request",
    approvalRequired: true, approverType: "Legal / Board (per Reviewer selected)",
    assignmentGroup: "Legal Advisory",
    visibilityScope: "all", visibleDepartments: [],
    notifyRequester: true, notifyAssignee: true,
    requiresResource: false, resourceType: "",
    status: "published",
  },
];

// Used whenever a service has no formFields defined (formFields is null/empty)
// — every seed and Builder-created service falls back to this automatically.
const GENERIC_FORM_FIELDS = [
  { name: "description", label: "Describe your request", type: "textarea" },
  { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
];

/* ----------------------------------------------------------------------
   TEMPLATE LIBRARY — pure data, never rendered as a live/requestable
   service on its own. Covers all 22 domains from the Enterprise Service
   Catalog Blueprint v1.0 (including Wave 1/2 domains already live, since
   the blueprint lists far more services per domain than what has been
   cloned so far). Admin browses this, clones an entry into the Service
   Builder form, configures it, and only then does it become a real
   entry in `services` state. Nothing here is a code path — adding a
   23rd domain to this array tomorrow requires no other change anywhere
   in the app.
---------------------------------------------------------------------- */

const TEMPLATE_LIBRARY = [
  // 01 Information Technology
  { id: "tpl-it-network", domain: "IT", category: "Network", name: "Network Service", description: "Wi-Fi, LAN, IP, firewall, or remote connectivity support.", suggestedSla: "1 business day", approvalRequired: false, iconKey: "shield" },
  { id: "tpl-it-asset", domain: "IT", category: "Hardware", name: "IT Asset", description: "Assignment, return, repair, or disposal of an IT asset.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "package" },
  { id: "tpl-it-change", domain: "IT", category: "Change", name: "IT Change", description: "Production or infrastructure change request.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "wrench" },
  // 02 Human Resources / People
  { id: "tpl-hr-onboarding", domain: "HR", category: "Lifecycle", name: "Onboarding", description: "Cross-functional new-hire onboarding coordination.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "users" },
  { id: "tpl-hr-offboarding", domain: "HR", category: "Lifecycle", name: "Offboarding", description: "Resignation or termination clearance.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "users" },
  { id: "tpl-hr-leave-query", domain: "HR", category: "Employee Support", name: "Leave / Time Query", description: "Leave balance, policy, or attendance correction.", suggestedSla: "1 business day", approvalRequired: false, iconKey: "help" },
  // 03 General Affairs & Workplace
  { id: "tpl-ga-workspace", domain: "GA", category: "Workplace", name: "Workspace / Desk", description: "Desk, workspace, or seating request.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "users" },
  { id: "tpl-ga-event", domain: "GA", category: "Workplace", name: "Event Support", description: "Town hall or internal event setup.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "users" },
  { id: "tpl-ga-building-access", domain: "GA", category: "Facilities", name: "Building Access", description: "Access area request with physical security.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "lock" },
  // 04 Legal
  { id: "tpl-legal-corp-doc", domain: "Legal", category: "Corporate", name: "Corporate Legal Document", description: "Power of attorney, corporate statement, or legal letter.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "scale" },
  { id: "tpl-legal-ip", domain: "Legal", category: "IP", name: "Trademark / IP", description: "Trademark, copyright, or IP request.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "file-lock" },
  { id: "tpl-legal-litigation", domain: "Legal", category: "Disputes", name: "Litigation / Dispute Support", description: "Dispute intake and coordination.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "scale" },
  // 05 Compliance / GRC
  { id: "tpl-compliance-inquiry", domain: "Compliance / GRC", category: "Advisory", name: "Compliance Inquiry", description: "Question on policy or regulatory requirement.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "help" },
  { id: "tpl-compliance-exception", domain: "Compliance / GRC", category: "Policy", name: "Policy Exception", description: "Request exception from internal policy.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "file-lock" },
  { id: "tpl-compliance-whistleblow", domain: "Compliance / GRC", category: "Case Management", name: "Whistleblowing Support", description: "Controlled case intake and escalation.", suggestedSla: "1 business day", approvalRequired: false, iconKey: "lock" },
  // 06 Risk & Internal Audit
  { id: "tpl-risk-assessment", domain: "Risk & Internal Audit", category: "Risk", name: "Risk Assessment", description: "Business, project, or process risk assessment.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "file-search" },
  { id: "tpl-risk-audit-request", domain: "Risk & Internal Audit", category: "Audit", name: "Audit Request", description: "Internal audit engagement or support request.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "file-search" },
  { id: "tpl-risk-issue-followup", domain: "Risk & Internal Audit", category: "Audit", name: "Issue Follow-up", description: "Remediation progress and closure tracking.", suggestedSla: "3 business days", approvalRequired: false, iconKey: "help" },
  // 07 Finance
  { id: "tpl-finance-travel-advance", domain: "Finance", category: "Travel", name: "Travel Advance", description: "Advance for business travel.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "wallet" },
  { id: "tpl-finance-invoice-inquiry", domain: "Finance", category: "Payments", name: "Invoice Inquiry", description: "Invoice or payment status inquiry.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "receipt" },
  { id: "tpl-finance-tax", domain: "Finance", category: "Tax", name: "Tax Service", description: "Tax document, query, or support.", suggestedSla: "3 business days", approvalRequired: false, iconKey: "receipt" },
  // 08 Procurement & Vendor Management
  { id: "tpl-proc-po-support", domain: "Procurement", category: "Sourcing", name: "PO Support", description: "Purchase order issue, change, or status.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "cart" },
  { id: "tpl-proc-supplier-perf", domain: "Procurement", category: "Vendor Management", name: "Supplier Performance", description: "Supplier issue or performance review.", suggestedSla: "5 business days", approvalRequired: false, iconKey: "handshake" },
  { id: "tpl-proc-emergency", domain: "Procurement", category: "Sourcing", name: "Emergency Purchase", description: "Exceptional urgent procurement.", suggestedSla: "1 business day", approvalRequired: true, iconKey: "cart" },
  // 09 Marketing
  { id: "tpl-mkt-campaign", domain: "Marketing", category: "Campaigns", name: "Campaign Request", description: "Launch or support a marketing campaign.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "filetext" },
  { id: "tpl-mkt-creative", domain: "Marketing", category: "Creative", name: "Creative Request", description: "Design, artwork, copy, video, or social asset.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "filetext" },
  { id: "tpl-mkt-brand-approval", domain: "Marketing", category: "Brand", name: "Brand Approval", description: "Logo or brand guideline review.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "scale" },
  // 10 Sales Operations / Commercial
  { id: "tpl-sales-crm", domain: "Sales Operations", category: "CRM", name: "CRM Support", description: "CRM access, data, or workflow correction.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "help" },
  { id: "tpl-sales-pricing", domain: "Sales Operations", category: "Commercial", name: "Pricing Request", description: "Special pricing or discount request.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "receipt" },
  { id: "tpl-sales-credit", domain: "Sales Operations", category: "Commercial", name: "Credit Approval", description: "Customer credit request.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "banknote" },
  // 11 Corporate Communications
  { id: "tpl-comms-announcement", domain: "Corporate Communications", category: "Internal Comms", name: "Internal Announcement", description: "Company-wide or internal communication.", suggestedSla: "2 business days", approvalRequired: true, iconKey: "filetext" },
  { id: "tpl-comms-media", domain: "Corporate Communications", category: "PR", name: "Media Inquiry", description: "Media response coordination.", suggestedSla: "1 business day", approvalRequired: true, iconKey: "help" },
  { id: "tpl-comms-press", domain: "Corporate Communications", category: "PR", name: "Press Release", description: "Draft, review, or publish a release.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "filetext" },
  // 12 Quality Management
  { id: "tpl-quality-ncr", domain: "Quality Management", category: "Nonconformity", name: "Nonconformity / NCR", description: "Raise and manage a nonconformity.", suggestedSla: "5 business days", approvalRequired: false, iconKey: "file-search" },
  { id: "tpl-quality-capa", domain: "Quality Management", category: "Nonconformity", name: "CAPA", description: "Corrective or preventive action.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "file-search" },
  { id: "tpl-quality-audit", domain: "Quality Management", category: "Audit", name: "Quality Audit", description: "Internal quality audit request.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "file-search" },
  // 13 HSE / Occupational Safety
  { id: "tpl-hse-incident", domain: "HSE", category: "Incident", name: "HSE Incident", description: "Report injury, near miss, or environmental incident.", suggestedSla: "Same-day triage", approvalRequired: false, iconKey: "alert" },
  { id: "tpl-hse-permit", domain: "HSE", category: "Safety", name: "Permit to Work", description: "Work permit request.", suggestedSla: "2 business days", approvalRequired: true, iconKey: "wrench" },
  { id: "tpl-hse-ppe", domain: "HSE", category: "Safety", name: "PPE Request", description: "Personal protective equipment request.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "package" },
  // 14 Information Security & Privacy
  { id: "tpl-secpriv-dpia", domain: "Security & Privacy", category: "Privacy", name: "DPIA / PIA", description: "Privacy impact assessment request.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "eye-off" },
  { id: "tpl-secpriv-vendor-sec", domain: "Security & Privacy", category: "Vendor Risk", name: "Vendor Security Review", description: "Third-party security assessment.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "shield-alert" },
  { id: "tpl-secpriv-dsr", domain: "Security & Privacy", category: "Privacy", name: "Data Subject Request", description: "Access, correction, or deletion request.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "eye-off" },
  // 15 Data / Analytics / AI
  { id: "tpl-data-access", domain: "Data / Analytics / AI", category: "Data Access", name: "Data Access", description: "Request dataset, database, or report access.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "lock" },
  { id: "tpl-data-bi-dashboard", domain: "Data / Analytics / AI", category: "BI", name: "BI Dashboard", description: "New or changed dashboard request.", suggestedSla: "5 business days", approvalRequired: false, iconKey: "file-search" },
  { id: "tpl-data-ai-use-case", domain: "Data / Analytics / AI", category: "AI Governance", name: "AI Use Case Intake", description: "Propose a new AI use case.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "help" },
  // 16 Project / PMO
  { id: "tpl-pmo-intake", domain: "Project / PMO", category: "Intake", name: "Project Intake", description: "Propose a new project or initiative.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "filetext" },
  { id: "tpl-pmo-change", domain: "Project / PMO", category: "Governance", name: "Project Change", description: "Scope, budget, or timeline change.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "filetext" },
  { id: "tpl-pmo-resource", domain: "Project / PMO", category: "Resourcing", name: "Project Resource", description: "Resource allocation request.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "users" },
  // 17 Sustainability / ESG
  { id: "tpl-esg-carbon", domain: "Sustainability / ESG", category: "Data", name: "Carbon Data Request", description: "Collect or review emissions activity data.", suggestedSla: "5 business days", approvalRequired: false, iconKey: "file-search" },
  { id: "tpl-esg-report", domain: "Sustainability / ESG", category: "Reporting", name: "ESG Report Support", description: "Data or content for ESG reporting.", suggestedSla: "5 business days", approvalRequired: false, iconKey: "filetext" },
  { id: "tpl-esg-training", domain: "Sustainability / ESG", category: "Learning", name: "Sustainability Training", description: "ESG or sustainability learning enrollment.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "help" },
  // 18 Corporate Secretariat / Governance
  { id: "tpl-gov-board-meeting", domain: "Corporate Secretariat", category: "Board", name: "Board Meeting", description: "Board agenda, papers, and logistics.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "scale" },
  { id: "tpl-gov-resolution", domain: "Corporate Secretariat", category: "Governance", name: "Resolution / Circular", description: "Prepare or approve a resolution.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "filetext" },
  { id: "tpl-gov-register", domain: "Corporate Secretariat", category: "Records", name: "Corporate Register", description: "Director, shareholder, or corporate register request.", suggestedSla: "3 business days", approvalRequired: false, iconKey: "filetext" },
  // 19 Travel & Mobility
  { id: "tpl-travel-business", domain: "Travel & Mobility", category: "Travel", name: "Business Travel", description: "Travel authorization.", suggestedSla: "2 business days", approvalRequired: true, iconKey: "car" },
  { id: "tpl-travel-hotel", domain: "Travel & Mobility", category: "Travel", name: "Hotel", description: "Accommodation booking.", suggestedSla: "1 business day", approvalRequired: false, iconKey: "car" },
  { id: "tpl-travel-visa", domain: "Travel & Mobility", category: "Travel", name: "Visa", description: "Business visa support.", suggestedSla: "5 business days", approvalRequired: false, iconKey: "filetext" },
  // 20 Document & Records Management
  { id: "tpl-doc-retrieval", domain: "Document & Records", category: "Records", name: "Document Retrieval", description: "Retrieve an archived document or record.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "file-search" },
  { id: "tpl-doc-archive", domain: "Document & Records", category: "Records", name: "Archive Request", description: "Archive a physical or digital record.", suggestedSla: "3 business days", approvalRequired: false, iconKey: "package" },
  { id: "tpl-doc-destruction", domain: "Document & Records", category: "Records", name: "Record Destruction", description: "Approved secure destruction.", suggestedSla: "5 business days", approvalRequired: true, iconKey: "lock" },
  // 21 Security / Physical Security
  { id: "tpl-physec-visitor", domain: "Physical Security", category: "Access", name: "Visitor Access", description: "Visitor pre-registration and access.", suggestedSla: "1 business day", approvalRequired: false, iconKey: "users" },
  { id: "tpl-physec-access-card", domain: "Physical Security", category: "Access", name: "Access Card", description: "Issue, change, or replace an access card.", suggestedSla: "2 business days", approvalRequired: true, iconKey: "lock" },
  { id: "tpl-physec-cctv", domain: "Physical Security", category: "Investigation", name: "CCTV Footage Request", description: "Controlled footage request.", suggestedSla: "3 business days", approvalRequired: true, iconKey: "shield-alert" },
  // 22 Product / Engineering Services
  { id: "tpl-eng-environment", domain: "Engineering", category: "Environments", name: "Environment Request", description: "Dev, test, or staging environment.", suggestedSla: "2 business days", approvalRequired: false, iconKey: "wrench" },
  { id: "tpl-eng-release", domain: "Engineering", category: "Release", name: "Release Request", description: "Deployment or release coordination.", suggestedSla: "2 business days", approvalRequired: true, iconKey: "wrench" },
  { id: "tpl-eng-repo-access", domain: "Engineering", category: "Access", name: "Repository Access", description: "Source-code or repository access.", suggestedSla: "1 business day", approvalRequired: true, iconKey: "lock" },
];

function domainsFromLibrary() {
  return Array.from(new Set(TEMPLATE_LIBRARY.map((t) => t.domain)));
}

const ROOMS = [
  { id: "merapi", name: "Merapi", floor: 8, capacity: 10, facilities: ["TV", "Video Conference", "Whiteboard"] },
  { id: "rinjani", name: "Rinjani", floor: 5, capacity: 6, facilities: ["TV", "Whiteboard"] },
  { id: "semeru", name: "Semeru", floor: 3, capacity: 20, facilities: ["Video Conference", "Whiteboard", "Catering Point"] },
  { id: "bromo", name: "Bromo", floor: 8, capacity: 4, facilities: ["TV"] },
];

const VEHICLES = [
  { id: "innova", name: "Toyota Innova", seats: 7, type: "MPV" },
  { id: "avanza", name: "Toyota Avanza", seats: 6, type: "MPV" },
  { id: "stargazer", name: "Hyundai Stargazer", seats: 6, type: "MPV" },
];

const DRIVERS = ["Pak Hendra Wijaya", "Pak Yusuf Ramadhan", "Pak Agus Santoso"];

const KNOWLEDGE = [
  { id: 1, category: "IT", title: "How to connect to the office WiFi", body: "Select ‘Nusantara-Corp’ from available networks and sign in with your company email and password. Contact IT if the network does not appear in your list." },
  { id: 2, category: "GA", title: "Meeting room booking etiquette", body: "Release rooms you no longer need at least 15 minutes in advance so colleagues can rebook. Rooms over 10 seats require approval." },
  { id: 3, category: "HR", title: "How to request an employment letter", body: "Submit an Employment Letter request with your purpose and preferred language. HR typically issues the letter within two business days." },
  { id: 4, category: "GA", title: "Company vehicle usage policy", body: "Vehicle bookings require manager and GA approval. Trips longer than 3 days require Department Head approval." },
];

/* ----------------------------------------------------------------------
   ANALYTICS — the monthly trend and SLA-compliance panels below are an
   illustrative historical baseline (pre-go-live), clearly labeled as
   such in the UI. They are NOT recomputed from live request data and
   are NOT extended to newly created services, because fabricating
   compliance history for a service that has no real track record yet
   would be misleading. The "Live Request Volume" panel on the Analytics
   page is the real one: it is computed directly from the `requests`
   array at render time, so any service — old or newly created via the
   Service Builder — appears there automatically the moment it has at
   least one real request.
---------------------------------------------------------------------- */

const MONTHLY_TREND = [
  { month: "Oct '25", IT: 42, GA: 28, HR: 15 },
  { month: "Nov '25", IT: 38, GA: 25, HR: 12 },
  { month: "Dec '25", IT: 45, GA: 30, HR: 18 },
  { month: "Jan '26", IT: 51, GA: 33, HR: 20 },
  { month: "Feb '26", IT: 47, GA: 29, HR: 17 },
  { month: "Mar '26", IT: 55, GA: 35, HR: 22 },
  { month: "Apr '26", IT: 58, GA: 31, HR: 19 },
  { month: "May '26", IT: 62, GA: 38, HR: 24 },
  { month: "Jun '26", IT: 59, GA: 34, HR: 21 },
  { month: "Jul '26", IT: 66, GA: 40, HR: 26 },
  { month: "Aug '26", IT: 71, GA: 37, HR: 23 },
  { month: "Sep '26", IT: 68, GA: 42, HR: 28 },
];

const SAME_MONTH_LAST_YEAR_TOTAL = 100; // Sep '25 baseline, for the YoY comparison

const SLA_COMPLIANCE = [
  { serviceId: "it-incident", metRate: 94 },
  { serviceId: "laptop-request", metRate: 88 },
  { serviceId: "software-request", metRate: 91 },
  { serviceId: "system-access", metRate: 97 },
  { serviceId: "meeting-room", metRate: 99 },
  { serviceId: "vehicle", metRate: 82 },
  { serviceId: "facility-maintenance", metRate: 90 },
  { serviceId: "office-supplies", metRate: 95 },
  { serviceId: "employment-letter", metRate: 93 },
  { serviceId: "hr-inquiry", metRate: 98 },
];

const SLA_POLICY_DEFAULTS = {
  "it-incident": { target: "4h response · 1 business day resolution", lastReviewed: "Aug 15, 2026" },
  "laptop-request": { target: "2 business days", lastReviewed: "Aug 15, 2026" },
  "software-request": { target: "3 business days", lastReviewed: "Jul 2, 2026" },
  "system-access": { target: "2 business days", lastReviewed: "Jul 2, 2026" },
  "meeting-room": { target: "Instant confirmation for most rooms", lastReviewed: "Jun 10, 2026" },
  "vehicle": { target: "1 business day", lastReviewed: "Jun 10, 2026" },
  "facility-maintenance": { target: "2 business days", lastReviewed: "Aug 15, 2026" },
  "office-supplies": { target: "3 business days", lastReviewed: "Jun 10, 2026" },
  "employment-letter": { target: "2 business days", lastReviewed: "May 20, 2026" },
  "hr-inquiry": { target: "1 business day", lastReviewed: "May 20, 2026" },
};

// Every service gets an SLA policy record — curated ones use the hand-set
// defaults above; anything else (Wave 2 onward, or Builder-created) falls
// back to its own catalog SLA text, flagged as not yet formally reviewed.
function buildInitialSlaPolicy(services) {
  const policy = {};
  services.forEach((s) => {
    policy[s.id] = SLA_POLICY_DEFAULTS[s.id] || { target: s.slaTarget || "Not yet defined", lastReviewed: "Not yet reviewed" };
  });
  return policy;
}

const INITIAL_REQUESTS = [
  { id: "REQ-2026-0142", service: "IT Incident", title: "Cannot connect to office WiFi", submitted: "Sep 9, 2026", status: "In Progress", sla: "On Track", assignee: "IT Service Desk", priority: "Medium", requester: "Bima Saputra" },
  { id: "REQ-2026-0139", service: "Laptop / Device Request", title: "Replacement laptop — screen flickering", submitted: "Sep 5, 2026", status: "Pending Approval", sla: "On Track", assignee: "—", priority: "Medium", requester: "Bima Saputra" },
  { id: "REQ-2026-0121", service: "HR Employment Letter", title: "Employment letter for visa application", submitted: "Aug 28, 2026", status: "Closed", sla: "Breached", assignee: "HR Service Team", priority: "Low", requester: "Bima Saputra" },
  { id: "REQ-2026-0118", service: "Facility Maintenance", title: "AC unit leaking — 8th floor east wing", submitted: "Aug 25, 2026", status: "Resolved", sla: "Met", assignee: "GA Facilities", priority: "Medium", requester: "Bima Saputra" },
  { id: "REQ-2026-0098", service: "Software / License Request", title: "Figma seat request", submitted: "Aug 12, 2026", status: "Closed", sla: "Met", assignee: "IT Procurement", priority: "Low", requester: "Bima Saputra" },
  { id: "REQ-2026-0145", service: "Software / License Request", title: "Adobe Creative Cloud seat request", submitted: "Sep 10, 2026", status: "Pending Approval", sla: "On Track", assignee: "—", priority: "Medium", requester: "Sri Handayani" },
  { id: "REQ-2026-0136", service: "Company Vehicle Booking", title: "Client visit to Surabaya", submitted: "Sep 8, 2026", status: "Pending Approval", sla: "On Track", assignee: "—", priority: "Medium", requester: "Fajar Nugroho" },
  { id: "REQ-2026-0130", service: "IT Incident", title: "Printer on 5th floor not responding", submitted: "Sep 7, 2026", status: "Submitted", sla: "At Risk", assignee: "—", priority: "High", requester: "Sri Handayani" },
  { id: "REQ-2026-0125", service: "System Access Request", title: "Access to Finance reporting dashboard", submitted: "Sep 4, 2026", status: "Approved", sla: "On Track", assignee: "—", priority: "Medium", requester: "Fajar Nugroho" },
  { id: "REQ-2026-0148", service: "Contract Review", title: "Review reseller agreement with PT Cahaya Mitra", submitted: "Sep 11, 2026", status: "Approved", sla: "On Track", assignee: "—", priority: "Medium", requester: "Fajar Nugroho" },
  { id: "REQ-2026-0149", service: "Privacy Inquiry", title: "Question on customer data retention period", submitted: "Sep 12, 2026", status: "Submitted", sla: "On Track", assignee: "—", priority: "Low", requester: "Sri Handayani" },
  { id: "REQ-2026-0150", service: "Vendor Security Review", title: "Security assessment for new analytics vendor", submitted: "Sep 10, 2026", status: "Approved", sla: "At Risk", assignee: "—", priority: "High", requester: "Bima Saputra" },
];

const INITIAL_BOOKINGS = [
  { id: "BK-2026-0087", type: "Meeting Room", resource: "Merapi — Floor 8", date: "Sep 12, 2026", time: "14:00–15:00", status: "Confirmed" },
  { id: "BK-2026-0081", type: "Vehicle", resource: "Toyota Innova + Driver", date: "Sep 15, 2026", time: "08:00–17:00", status: "Pending Approval" },
  { id: "BK-2026-0070", type: "Meeting Room", resource: "Rinjani — Floor 5", date: "Sep 3, 2026", time: "09:00–10:00", status: "Completed" },
];

const AI_EXAMPLES = [
  "My laptop cannot connect to WiFi",
  "I need a meeting room tomorrow at 10 for eight people",
  "Book a car tomorrow morning to Bandung for four people",
  "I need an employment letter",
  "The AC on the 8th floor is leaking",
];

const STATUS_STYLES = {
  "Draft": "bg-slate-100 text-slate-600",
  "Submitted": "bg-sky-50 text-sky-700 border border-sky-200",
  "Under Review": "bg-sky-50 text-sky-700 border border-sky-200",
  "Pending Approval": "bg-amber-50 text-amber-700 border border-amber-200",
  "Approved": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Assigned": "bg-violet-50 text-violet-700 border border-violet-200",
  "In Progress": "bg-violet-50 text-violet-700 border border-violet-200",
  "Pending": "bg-amber-50 text-amber-700 border border-amber-200",
  "Resolved": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Completed": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Confirmed": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Closed": "bg-slate-100 text-slate-500",
  "Rejected": "bg-rose-50 text-rose-700 border border-rose-200",
  "Cancelled": "bg-slate-100 text-slate-500",
  "Published": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Low": "bg-slate-100 text-slate-600",
  "Medium": "bg-sky-50 text-sky-700 border border-sky-200",
  "High": "bg-amber-50 text-amber-700 border border-amber-200",
  "Critical": "bg-rose-50 text-rose-700 border border-rose-200",
  "On Track": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Breached": "bg-rose-50 text-rose-700 border border-rose-200",
  "No Coverage": "bg-rose-50 text-rose-700 border border-rose-200",
  "At Risk": "bg-rose-50 text-rose-700 border border-rose-200",
  "Met": "bg-slate-100 text-slate-500",
  "Active": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Expired": "bg-slate-100 text-slate-500",
};

const REQUEST_LIFECYCLE = {
  standard: ["Submitted", "Pending Approval", "Approved", "Assigned", "In Progress", "Resolved", "Closed"],
  noApproval: ["Submitted", "Assigned", "In Progress", "Resolved", "Closed"],
};

function getLifecycleSteps(serviceName, services) {
  const service = services.find((s) => s.name === serviceName);
  return service && !service.approvalRequired ? REQUEST_LIFECYCLE.noApproval : REQUEST_LIFECYCLE.standard;
}

/* ----------------------------------------------------------------------
   HELPERS
---------------------------------------------------------------------- */

const WORD_NUMS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const CITIES = ["bandung", "surabaya", "bogor", "semarang", "yogyakarta", "bali", "malang"];

function extractCount(text) {
  const digitMatch = text.match(/(\d+)\s*(people|pax|person|passengers)/);
  if (digitMatch) return parseInt(digitMatch[1], 10);
  const wordMatch = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b\s*(people|pax|person|passengers)/);
  if (wordMatch) return WORD_NUMS[wordMatch[1]];
  return null;
}

function extractTime(text) {
  const m = text.match(/at\s*(\d{1,2})(:(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[3] ? m[3] : "00";
  const ampm = m[4];
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function extractDestination(text) {
  const found = CITIES.find((c) => text.includes(c));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : null;
}

function extractFloor(text) {
  const m = text.match(/(\d+)(st|nd|rd|th)?\s*floor/);
  return m ? m[1] : null;
}

function tomorrowISO() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function daysAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function requestableServices(services) {
  return services.filter((s) => s.status === "published" && (s.visibilityScope === "all" || s.visibleDepartments.includes(CURRENT_USER.dept)));
}

function parseAIQuery(rawText, services) {
  const text = rawText.toLowerCase();
  const pool = requestableServices(services);

  if (text.includes("wifi") || text.includes("network") || (text.includes("laptop") && (text.includes("connect") || text.includes("cannot") || text.includes("not working")))) {
    return {
      view: "serviceDetail", serviceId: "it-incident",
      summary: [{ label: "Detected intent", value: "IT Incident" }, { label: "Category", value: "Network" }, { label: "Priority", value: "Medium" }],
      prefill: { description: rawText, category: "Network", priority: "Medium" },
    };
  }

  if (text.includes("meeting room") || (text.includes("room") && extractCount(text) !== null)) {
    const capacity = extractCount(text);
    const time = extractTime(text) || "10:00";
    const summary = [{ label: "Detected intent", value: "Meeting Room Booking" }];
    if (text.includes("tomorrow")) summary.push({ label: "Date", value: tomorrowISO() });
    summary.push({ label: "Time", value: time });
    if (capacity) summary.push({ label: "Capacity", value: `${capacity} people` });
    return {
      view: "roomBooking", serviceId: "meeting-room", summary,
      prefill: { date: text.includes("tomorrow") ? tomorrowISO() : "", time, capacity: capacity || "" },
    };
  }

  if (text.includes("car") || text.includes("vehicle") || (text.includes("drive") && !text.includes("driver request"))) {
    const destination = extractDestination(text);
    const passengers = extractCount(text);
    let time = extractTime(text);
    if (!time) {
      if (text.includes("morning")) time = "09:00";
      else if (text.includes("afternoon")) time = "13:00";
      else if (text.includes("evening")) time = "18:00";
    }
    const summary = [{ label: "Detected intent", value: "Company Vehicle Booking" }];
    if (text.includes("tomorrow")) summary.push({ label: "Date", value: tomorrowISO() });
    if (time) summary.push({ label: "Departure", value: time });
    if (destination) summary.push({ label: "Destination", value: destination });
    if (passengers) summary.push({ label: "Passengers", value: `${passengers}` });
    return {
      view: "vehicleBooking", serviceId: "vehicle", summary,
      prefill: { date: text.includes("tomorrow") ? tomorrowISO() : "", time: time || "", destination: destination || "", passengers: passengers || "" },
    };
  }

  if (text.includes("employment letter") || (text.includes("letter") && text.includes("employ"))) {
    return {
      view: "serviceDetail", serviceId: "employment-letter",
      summary: [{ label: "Detected intent", value: "HR Employment Letter" }],
      prefill: { notes: rawText },
    };
  }

  if (text.includes(" ac ") || text.startsWith("ac ") || text.includes("leak") || text.includes("air condition") || text.includes("broken")) {
    const floor = extractFloor(text);
    const summary = [{ label: "Detected intent", value: "Facility Maintenance" }];
    if (floor) summary.push({ label: "Location", value: `Floor ${floor}` });
    return {
      view: "serviceDetail", serviceId: "facility-maintenance", summary,
      prefill: { location: floor ? `Floor ${floor}` : "", description: rawText },
    };
  }

  const match = pool.find((s) => (s.keywords || []).some((k) => text.includes(k)) || text.includes(s.name.toLowerCase()));
  if (match) {
    return {
      view: match.id === "meeting-room" ? "roomBooking" : match.id === "vehicle" ? "vehicleBooking" : "serviceDetail",
      serviceId: match.id,
      summary: [{ label: "Best match", value: match.name }],
      prefill: { description: rawText },
    };
  }

  return null;
}

/* ----------------------------------------------------------------------
   SMALL UI PRIMITIVES
---------------------------------------------------------------------- */

function Badge({ label }) {
  const style = STATUS_STYLES[label] || "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>{label}</span>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-700 text-white hover:bg-indigo-800",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white border border-slate-200 rounded-lg ${className}`}>{children}</div>;
}

function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400";

function TextInput(props) {
  return <input className={inputClass} {...props} />;
}

function Select({ options, ...props }) {
  return (
    <select className={inputClass} {...props}>
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextArea(props) {
  return <textarea className={`${inputClass} min-h-[96px]`} {...props} />;
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="rounded border-slate-300" />
      {label}
    </label>
  );
}

// A <select> that also offers "+ Create new …" — picking it reveals a text
// input so the value typed becomes a brand-new option, with no schema
// change anywhere else. This is what makes Domain and Category genuinely
// tenant-configurable rather than a fixed enum.
function ComboCreate({ options, value, onChange, placeholder }) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  if (creating) {
    return (
      <div className="flex gap-2">
        <TextInput autoFocus placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button
          variant="secondary"
          onClick={() => {
            if (draft.trim()) { onChange(draft.trim()); setCreating(false); setDraft(""); }
          }}
        >
          Add
        </Button>
        <Button variant="ghost" onClick={() => { setCreating(false); setDraft(""); }}>Cancel</Button>
      </div>
    );
  }

  return (
    <select
      className={inputClass}
      value={value}
      onChange={(e) => {
        if (e.target.value === "__create__") setCreating(true);
        else onChange(e.target.value);
      }}
    >
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__create__">+ Create new…</option>
    </select>
  );
}

function Logo({ size = "md" }) {
  const dim = size === "lg" ? "w-11 h-11 text-lg" : "w-8 h-8 text-sm";
  return (
    <div className={`${dim} rounded-lg bg-indigo-700 text-white font-bold flex items-center justify-center shrink-0`}>N</div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700 mb-1">{title}</p>
      <p className="text-sm text-slate-500 max-w-sm">{body}</p>
    </div>
  );
}

function PageHeader({ title, subtitle, onBack, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {onBack && (
          <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ----------------------------------------------------------------------
   LOGIN
---------------------------------------------------------------------- */

const QUICK_SIGNIN_OPTIONS = [
  { persona: "employee", user: CURRENT_USER, roleLabel: "Employee", color: "bg-indigo-600" },
  { persona: "manager", user: MANAGER_USER, roleLabel: "Manager", color: "bg-violet-600" },
  { persona: "agent", user: AGENT_IDENTITIES[0], agentName: AGENT_IDENTITIES[0].name, roleLabel: "Agent · Single Team", color: "bg-sky-600" },
  { persona: "agent", user: AGENT_IDENTITIES[1], agentName: AGENT_IDENTITIES[1].name, roleLabel: "Agent · Multi Team", color: "bg-rose-600" },
  { persona: "admin", user: ADMIN_USER, roleLabel: "Admin", color: "bg-amber-600" },
];

function LoginScreen({ onSignIn, onQuickSignIn }) {
  const [email, setEmail] = useState("bima.saputra@nusantaradigital.co.id");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">{PRODUCT_NAME}</h1>
          <p className="text-sm text-slate-500">Enterprise Service Management</p>
        </div>
        <Card className="p-6">
          <p className="text-xs font-medium text-slate-400 mb-4 text-center">{TENANT_NAME}</p>
          <Field label="Email">
            <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between mb-5 text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" defaultChecked className="rounded border-slate-300" /> Remember me
            </label>
            <a href="#" className="text-indigo-700 hover:underline" onClick={(e) => e.preventDefault()}>Forgot password?</a>
          </div>
          <Button className="w-full" onClick={onSignIn}>Sign In</Button>
          <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
          <Button variant="secondary" className="w-full" onClick={onSignIn}>Continue with SSO</Button>
        </Card>

        <div className="flex items-center gap-3 mt-8 mb-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-400 whitespace-nowrap">Demo — quick sign-in as</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>
        <div className="space-y-2">
          {QUICK_SIGNIN_OPTIONS.map((opt, i) => (
            <button
              key={i}
              onClick={() => onQuickSignIn(opt.persona, opt.agentName)}
              className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-slate-50 transition-colors text-left"
            >
              <div className={`w-10 h-10 rounded-full ${opt.color} text-white text-sm font-medium flex items-center justify-center shrink-0`}>
                {opt.user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{opt.user.name}</p>
                <p className="text-xs text-slate-500 truncate">{opt.roleLabel} · {opt.user.title}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">Multi-tenant SaaS · Interactive prototype</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   SIDEBAR + HEADER
---------------------------------------------------------------------- */

const NAV_ITEMS_BY_PERSONA = {
  employee: [
    { key: "home", label: "Home", icon: Home, views: ["home"] },
    { key: "catalog", label: "Services", icon: LayoutGrid, views: ["catalog", "serviceDetail"] },
    { key: "requests", label: "My Requests", icon: ClipboardList, views: ["myRequests", "requestDetail"] },
    { key: "bookings", label: "My Bookings", icon: CalendarDays, views: ["myBookings", "roomBooking", "vehicleBooking"] },
    { key: "approvals", label: "My Approvals", icon: CheckSquare, views: ["approvals"] },
    { key: "knowledge", label: "Knowledge", icon: BookOpen, views: ["knowledge"] },
  ],
  manager: [
    { key: "managerHome", label: "Dashboard", icon: Home, views: ["managerHome"] },
    { key: "pendingApprovals", label: "Pending Approvals", icon: CheckSquare, views: ["pendingApprovals", "requestDetail"] },
    { key: "teamRequests", label: "Team Requests", icon: ClipboardList, views: ["teamRequests"] },
    { key: "knowledge", label: "Knowledge", icon: BookOpen, views: ["knowledge"] },
  ],
  agent: [
    { key: "agentQueue", label: "My Queue", icon: ClipboardList, views: ["agentQueue", "requestDetail"] },
    { key: "knowledge", label: "Knowledge", icon: BookOpen, views: ["knowledge"] },
  ],
  admin: [
    { key: "serviceBuilder", label: "Service Builder", icon: LayoutGrid, views: ["serviceBuilder", "serviceForm"] },
    { key: "teamsAccess", label: "Teams & Access", icon: Users, views: ["teamsAccess"] },
    { key: "analytics", label: "Analytics", icon: BarChart3, views: ["analytics"] },
    { key: "slaPolicy", label: "SLA Policy", icon: SlidersHorizontal, views: ["slaPolicy"] },
  ],
};

const PERSONA_USERS = { employee: CURRENT_USER, manager: MANAGER_USER, admin: ADMIN_USER };

function getPersonaUser(persona, agentIdentityName) {
  if (persona === "agent") return AGENT_IDENTITIES.find((a) => a.name === agentIdentityName) || AGENT_IDENTITIES[0];
  return PERSONA_USERS[persona];
}

function Sidebar({ view, goTo, onSignOut, persona, switchPersona, agentIdentityName, setAgentIdentityName }) {
  const navItems = NAV_ITEMS_BY_PERSONA[persona];
  const personaUser = getPersonaUser(persona, agentIdentityName);
  return (
    <div className="w-64 shrink-0 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo />
        <div>
          <p className="text-white text-sm font-semibold leading-tight">{PRODUCT_NAME}</p>
          <p className="text-xs text-slate-500 leading-tight">{TENANT_NAME}</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <p className="text-xs text-slate-500 px-2 mb-1.5">Preview as Persona <span className="text-slate-600">· Demo/QA only</span></p>
        <div className="flex bg-slate-800 rounded-lg p-1">
          {["employee", "manager", "agent", "admin"].map((p) => (
            <button
              key={p}
              onClick={() => switchPersona(p)}
              className={`flex-1 text-xs py-1.5 rounded-md capitalize transition-colors ${persona === p ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {persona === "agent" && (
        <div className="px-3 pb-3">
          <p className="text-xs text-slate-500 px-2 mb-1.5">Preview as Agent</p>
          <select
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-2 focus:outline-none"
            value={agentIdentityName}
            onChange={(e) => setAgentIdentityName(e.target.value)}
          >
            {AGENT_IDENTITIES.map((a) => <option key={a.name} value={a.name}>{a.name} — {a.title}</option>)}
          </select>
        </div>
      )}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = item.views.includes(view);
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => goTo(item.views[0])}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? "bg-slate-800 text-white" : "hover:bg-slate-800/60 hover:text-white"}`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : "text-slate-400"}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-indigo-700 text-white text-sm font-medium flex items-center justify-center shrink-0">
            {personaUser.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white truncate">{personaUser.name}</p>
            <p className="text-xs text-slate-500 truncate">{personaUser.title}</p>
          </div>
          <button onClick={onSignOut} title="Sign out" className="text-slate-500 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLES = {
  home: "Home", catalog: "Service Catalog", serviceDetail: "Service Detail",
  myRequests: "My Requests", requestDetail: "Request Detail", myBookings: "My Bookings",
  roomBooking: "Meeting Room Booking", vehicleBooking: "Company Vehicle Booking",
  approvals: "My Approvals", knowledge: "Knowledge",
  managerHome: "Dashboard", pendingApprovals: "Pending Approvals", teamRequests: "Team Requests",
  agentQueue: "My Queue", analytics: "Analytics", slaPolicy: "SLA Policy",
  serviceBuilder: "Service Builder", serviceForm: "Configure Service", teamsAccess: "Teams & Access",
};

function TopHeader({ view, persona, requests, services, agentIdentityName, memberships }) {
  const personaUser = getPersonaUser(persona, agentIdentityName);
  const [notifOpen, setNotifOpen] = useState(false);

  let notifications = [
    { id: 1, text: "Your Laptop / Device Request was sent for manager approval.", time: "2h ago" },
    { id: 2, text: "Meeting room Merapi is confirmed for Sep 12, 14:00.", time: "1d ago" },
    { id: 3, text: "Your Employment Letter request was completed.", time: "3d ago" },
  ];

  if (persona === "agent") {
    const authorizedTeams = getAuthorizedTeams(agentIdentityName, memberships);
    const authorizedGroups = Array.from(new Set(authorizedTeams.flatMap((t) => t.assignmentGroups)));
    const teamLabel = authorizedTeams.map((t) => t.name).join(", ") || "no authorized team";
    const waiting = requests.filter((r) => {
      const svc = services.find((s) => s.name === r.service);
      return svc && authorizedGroups.includes(svc.assignmentGroup) && r.assignee === "—" && !["Completed", "Closed", "Rejected", "Cancelled", "Resolved"].includes(r.status);
    });
    notifications = waiting.length
      ? waiting.slice(0, 5).map((r) => ({ id: r.id, text: `New for ${teamLabel}: ${r.title}`, time: "Unassigned" }))
      : [{ id: "none", text: authorizedTeams.length ? `No new requests waiting for ${teamLabel}.` : "No active team membership.", time: "" }];
  } else if (persona === "manager") {
    const pendingCount = requests.filter((r) => r.status === "Pending Approval").length;
    notifications = [{ id: "pending", text: pendingCount ? `${pendingCount} request${pendingCount === 1 ? "" : "s"} waiting on your approval.` : "Nothing waiting on your approval.", time: "" }];
  }

  return (
    <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <p className="text-sm font-medium text-slate-500">{PAGE_TITLES[view]}</p>
      <div className="flex items-center gap-4 relative">
        <button onClick={() => setNotifOpen((v) => !v)} className="relative text-slate-500 hover:text-slate-700">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-20">
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Notifications</p>
            {notifications.map((n) => (
              <div key={n.id} className="px-4 py-2.5 hover:bg-slate-50">
                <p className="text-sm text-slate-700">{n.text}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
              </div>
            ))}
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-indigo-700 text-white text-xs font-medium flex items-center justify-center">
          {personaUser.initials}
        </div>
      </div>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
      <Check className="w-4 h-4 text-emerald-400" /> {message}
    </div>
  );
}

/* ----------------------------------------------------------------------
   HOME
---------------------------------------------------------------------- */

function HomePage({ goTo, requests, bookings, services }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(undefined); // undefined = not asked, null = no match, object = match

  function runQuery(text) {
    if (!text.trim()) return;
    setQuery(text);
    setLoading(true);
    setResult(undefined);
    setTimeout(() => {
      setResult(parseAIQuery(text, services));
      setLoading(false);
    }, 550);
  }

  const myRequests = requests.filter((r) => r.requester === CURRENT_USER.name);
  const openRequests = myRequests.filter((r) => !["Completed", "Closed", "Rejected", "Cancelled"].includes(r.status)).length;
  const pendingApproval = myRequests.filter((r) => r.status === "Pending Approval").length;
  const upcomingBookings = bookings.filter((b) => b.status !== "Completed").length;
  const recentlyCompleted = myRequests.filter((r) => ["Completed", "Resolved", "Closed"].includes(r.status)).length;

  const catalog = requestableServices(services);

  const quickServiceIds = ["it-incident", "meeting-room", "vehicle", "facility-maintenance", "hr-inquiry", "office-supplies"];
  const quickServices = quickServiceIds
    .map((id) => catalog.find((s) => s.id === id))
    .filter(Boolean);

  function openService(id) {
    if (id === "meeting-room") goTo("roomBooking");
    else if (id === "vehicle") goTo("vehicleBooking");
    else goTo("serviceDetail", { serviceId: id });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">{greeting()}, {CURRENT_USER.name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-500 mb-6">{CURRENT_USER.dept} · {CURRENT_USER.location}</p>

      <Card className="p-5 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <p className="text-sm font-medium text-slate-700">What can we help you with today?</p>
        </div>
        <div className="flex gap-2 mt-3">
          <TextInput
            placeholder="e.g. I need a meeting room tomorrow at 10 for eight people"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runQuery(query)}
          />
          <Button onClick={() => runQuery(query)}><Search className="w-4 h-4" /> Ask</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {AI_EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => runQuery(ex)} className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <Card className="p-4 mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Understanding your request…
        </Card>
      )}

      {!loading && result === null && (
        <Card className="p-4 mb-6">
          <p className="text-sm text-slate-700 mb-2">We could not confidently match that to a service yet.</p>
          <Button variant="secondary" onClick={() => goTo("catalog")}>Browse Service Catalog</Button>
        </Card>
      )}

      {!loading && result && (
        <Card className="p-4 mb-6 border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-medium text-slate-700">Here is what I found</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {result.summary.map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {s.label}: <span className="font-medium">{s.value}</span>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => goTo(result.view, { serviceId: result.serviceId, prefill: result.prefill })}>
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" onClick={() => setResult(undefined)}>Not quite</Button>
          </div>
        </Card>
      )}

      <p className="text-sm font-semibold text-slate-700 mb-3">Quick Services</p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {quickServices.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => openService(s.id)} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
              <Icon className="w-5 h-5 text-indigo-700" />
              <span className="text-xs text-slate-600 text-center">{s.name}</span>
            </button>
          );
        })}
      </div>

      <p className="text-sm font-semibold text-slate-700 mb-3">My Activity</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Open Requests", value: openRequests, view: "myRequests", tab: "Open" },
          { label: "Pending Approval", value: pendingApproval, view: "myRequests", tab: "Pending Approval" },
          { label: "Upcoming Bookings", value: upcomingBookings, view: "myBookings", tab: "Upcoming" },
          { label: "Recently Completed", value: recentlyCompleted, view: "myRequests", tab: "Completed" },
        ].map((s) => (
          <button key={s.label} onClick={() => goTo(s.view, { prefill: { tab: s.tab } })} className="text-left">
            <Card className="p-4 hover:border-indigo-300 transition-colors">
              <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Popular Services</p>
          <div className="space-y-2">
            {catalog.slice(0, 4).map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => openService(s.id)} className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 text-left">
                  <Icon className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span className="text-sm text-slate-700">{s.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Knowledge Suggestions</p>
          <div className="space-y-2">
            {KNOWLEDGE.slice(0, 3).map((k) => (
              <button key={k.id} onClick={() => goTo("knowledge")} className="w-full flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 text-left">
                <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-700">{k.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   SERVICE CATALOG + DETAIL
---------------------------------------------------------------------- */

function CatalogPage({ goTo, services }) {
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("All");
  const catalog = requestableServices(services);
  const domains = ["All", ...Array.from(new Set(catalog.map((s) => s.domain)))];
  const filtered = catalog.filter((s) => (domain === "All" || s.domain === domain) && s.name.toLowerCase().includes(search.toLowerCase()));

  function open(s) {
    if (s.id === "meeting-room") goTo("roomBooking");
    else if (s.id === "vehicle") goTo("vehicleBooking");
    else goTo("serviceDetail", { serviceId: s.id });
  }

  return (
    <div>
      <PageHeader title="Service Catalog" subtitle="Find and request any internal service in one place." />
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="Search services" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {domains.map((d) => (
            <button key={d} onClick={() => setDomain(d)} className={`px-3 py-2 rounded-lg text-sm ${domain === d ? "bg-indigo-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {filtered.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">{s.domain}</span>
                <Button variant="secondary" onClick={() => open(s)}>Request</Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-12">No services match your search.</p>}
      </div>
    </div>
  );
}

function ServiceDetailPage({ serviceId, prefill, goTo, onCreateRequest, slaPolicy, services }) {
  const service = services.find((s) => s.id === serviceId) || services[0];
  const fields = (service.formFields && service.formFields.length ? service.formFields : GENERIC_FORM_FIELDS);
  const slaTarget = (slaPolicy[service.id] && slaPolicy[service.id].target) || "Not yet defined";
  const [values, setValues] = useState(() => {
    const initial = {};
    fields.forEach((f) => { initial[f.name] = prefill[f.name] || ""; });
    return initial;
  });
  const [attachedFile, setAttachedFile] = useState(null);

  function setValue(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    setAttachedFile(file ? { name: file.name, size: file.size } : null);
  }

  function submit() {
    const descriptiveField = fields.find((f) => f.type === "textarea");
    const linkField = fields.find((f) => f.type === "link");
    const titleField = fields.find((f) => f.name === "documentTitle");
    const title = (titleField && values[titleField.name])
      ? values[titleField.name].slice(0, 60)
      : (descriptiveField && values[descriptiveField.name]) ? values[descriptiveField.name].slice(0, 60) : service.name;
    const req = onCreateRequest({
      serviceId: service.id,
      title,
      priority: values.priority || values.urgency || "Medium",
      attachmentName: attachedFile ? attachedFile.name : "",
      documentLink: linkField ? values[linkField.name] : "",
    });
    goTo("requestDetail", { requestId: req.id, prefill: { backTo: "myRequests" } });
  }

  const Icon = service.icon;
  const relatedArticle = KNOWLEDGE.find((k) => k.category === service.domain);

  return (
    <div>
      <PageHeader title={service.name} onBack={() => goTo("catalog")} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <p className="text-sm text-slate-600">{service.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">SLA</p>
              <p className="text-slate-700">{slaTarget}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Approval</p>
              <p className="text-slate-700">{service.approvalRequired ? service.approverType : "No approval required"}</p>
            </div>
          </div>
          <div className="h-px bg-slate-100 mb-6" />
          <p className="text-sm font-semibold text-slate-700 mb-4">Request Details</p>
          {fields.map((f) => (
            <Field key={f.name} label={f.label}>
              {f.type === "select" && <Select options={f.options} value={values[f.name]} onChange={(e) => setValue(f.name, e.target.value)} />}
              {f.type === "textarea" && <TextArea value={values[f.name]} onChange={(e) => setValue(f.name, e.target.value)} />}
              {f.type === "text" && <TextInput value={values[f.name]} onChange={(e) => setValue(f.name, e.target.value)} />}
              {f.type === "link" && <TextInput type="url" placeholder="https://drive.google.com/..." value={values[f.name]} onChange={(e) => setValue(f.name, e.target.value)} />}
            </Field>
          ))}
          <Field label="Attach a file (optional)">
            {attachedFile ? (
              <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate flex-1">{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg px-3 py-2 cursor-pointer hover:border-indigo-300 hover:text-indigo-700">
                <Paperclip className="w-3.5 h-3.5 shrink-0" /> Choose a file
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            )}
            <p className="text-xs text-slate-400 mt-1">Captured on the request for reference — this prototype has no file storage backend, so only the file name is kept, not its contents.</p>
          </Field>
          <Button onClick={submit}>Submit Request</Button>
        </Card>
        <div>
          {relatedArticle && (
            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Related Knowledge</p>
              <button onClick={() => goTo("knowledge")} className="text-left">
                <p className="text-sm text-slate-700 hover:text-indigo-700">{relatedArticle.title}</p>
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   MY REQUESTS + DETAIL
---------------------------------------------------------------------- */

function MyRequestsPage({ requests, goTo, prefill }) {
  const [tab, setTab] = useState((prefill && prefill.tab) || "All");
  const tabs = ["All", "Open", "Pending Approval", "Completed"];
  const own = requests.filter((r) => r.requester === CURRENT_USER.name);
  const filtered = own.filter((r) => {
    if (tab === "All") return true;
    if (tab === "Open") return !["Completed", "Closed", "Rejected", "Cancelled"].includes(r.status);
    if (tab === "Pending Approval") return r.status === "Pending Approval";
    if (tab === "Completed") return ["Completed", "Resolved", "Closed"].includes(r.status);
    return true;
  });

  return (
    <div>
      <PageHeader title="My Requests" subtitle="Track every service request you have submitted." />
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-sm ${tab === t ? "bg-indigo-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            {t}
          </button>
        ))}
      </div>
      <Card>
        {filtered.length === 0 && <EmptyState icon={ClipboardList} title="No requests here" body="Requests matching this filter will show up as soon as you submit or receive them." />}
        {filtered.map((r, i) => (
          <button key={r.id} onClick={() => goTo("requestDetail", { requestId: r.id, prefill: { backTo: "myRequests" } })} className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.id} · {r.service} · Submitted {r.submitted}</p>
            </div>
            <Badge label={r.status} />
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        ))}
      </Card>
    </div>
  );
}

function MessageIcon() {
  return <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5"><Info className="w-3 h-3 text-slate-400" /></div>;
}

function RequestDetailPage({ requestId, requests, goTo, prefill, viewer, services, agentIdentityName, memberships, onApprove, onReject, onRequestInfo, onAssignToMe, onAdvanceStatus, onCloseRequest, onReopenRequest, onToast }) {
  const request = requests.find((r) => r.id === requestId) || requests[0];
  const isTerminalNegative = ["Rejected", "Cancelled"].includes(request.status);
  const steps = getLifecycleSteps(request.service, services);
  const currentIndex = steps.indexOf(request.status);
  const requesterInfo = REQUESTER_INFO[request.requester];
  const backTo = (prefill && prefill.backTo) || "myRequests";

  const [delegating, setDelegating] = useState(false);
  const [delegateName, setDelegateName] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const RESOLUTION_SUGGESTIONS = {
    "IT Incident": "Confirm the device is on the ‘Nusantara-Corp’ network profile and reset the network adapter. Escalate to the Network team if the issue persists.",
    "Laptop / Device Request": "Check the asset pool for available inventory before opening a procurement task.",
    "Software / License Request": "Verify the existing license pool for a free seat before requesting a new purchase.",
    "System Access Request": "Confirm the requested access level matches the requester’s role before provisioning.",
    "Facility Maintenance": "Assign to the internal technician on shift; escalate to a vendor if parts are required.",
    "Office Supplies Request": "Check current inventory before triggering a procurement task.",
    "Company Vehicle Booking": "Confirm vehicle and driver availability, then route to GA for final confirmation.",
  };

  function runSummary() {
    setAiSuggestion(null);
    setAiLoading(true);
    setTimeout(() => {
      setAiSummary(`${request.requester} reported "${request.title}" under ${request.service}. Priority ${request.priority}, currently ${request.status}. No related open requests from the same requester in the last 30 days.`);
      setAiLoading(false);
    }, 550);
  }

  function runSuggestion() {
    setAiSummary(null);
    setAiLoading(true);
    setTimeout(() => {
      setAiSuggestion(RESOLUTION_SUGGESTIONS[request.service] || "Review similar past requests before proceeding with resolution.");
      setAiLoading(false);
    }, 550);
  }

  // Defense in depth: even if a request were somehow reached outside the
  // agent's own scoped queue, re-check authorization here rather than
  // trusting the list filter alone. In production this check is backend-
  // authoritative regardless of what the frontend does or doesn't render.
  if (viewer === "agent") {
    const requestService = services.find((s) => s.name === request.service);
    const authorizedGroups = Array.from(new Set(getAuthorizedTeams(agentIdentityName, memberships).flatMap((t) => t.assignmentGroups)));
    const isAuthorized = requestService && authorizedGroups.includes(requestService.assignmentGroup);
    if (!isAuthorized) {
      return (
        <div>
          <PageHeader title="Access Denied" onBack={() => goTo(backTo)} />
          <Card className="p-6">
            <EmptyState
              icon={Lock}
              title="Not authorized"
              body={`${agentIdentityName} is not a member of the team that owns this request${requestService ? ` (${requestService.assignmentGroup})` : ""}. In production this is enforced server-side no matter how the page was reached.`}
            />
          </Card>
        </div>
      );
    }
  }

  return (
    <div>
      <PageHeader
        title={request.title}
        subtitle={`${request.id} · ${request.service}`}
        onBack={() => goTo(backTo)}
        actions={<Badge label={request.status} />}
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {viewer === "employee" && request.requester === CURRENT_USER.name && request.status === "Resolved" && (
            <Card className="p-5 border-emerald-200">
              <p className="text-sm font-semibold text-slate-700 mb-1">This request has been marked resolved</p>
              <p className="text-sm text-slate-500 mb-3">Confirm the fix works for you and close it out, or reopen it if the issue is not fully solved.</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onCloseRequest(request.id)}>Confirm & Close</Button>
                <Button variant="secondary" onClick={() => onReopenRequest(request.id)}>Not Resolved — Reopen</Button>
              </div>
            </Card>
          )}

          {viewer === "manager" && request.status === "Pending Approval" && (
            <Card className="p-5 border-amber-200">
              <p className="text-sm font-semibold text-slate-700 mb-3">Approval Decision</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => onApprove(request.id)}>Approve</Button>
                <Button variant="danger" onClick={() => onReject(request.id)}>Reject</Button>
                <Button variant="secondary" onClick={() => onRequestInfo(request.id)}>Request Information</Button>
                <Button variant="ghost" onClick={() => setDelegating((v) => !v)}>Delegate</Button>
              </div>
              {delegating && (
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
                  <Select options={["Rina Kartika (Acting Manager)"]} value={delegateName} onChange={(e) => setDelegateName(e.target.value)} />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onToast(`${request.id} delegated to ${delegateName || "Rina Kartika (Acting Manager)"}`);
                      setDelegating(false);
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              )}
            </Card>
          )}

          {viewer === "agent" && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Agent Actions</p>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {request.assignee !== agentIdentityName && (
                  <Button variant="secondary" onClick={() => onAssignToMe(request.id)}>Assign to Me</Button>
                )}
                {!["Resolved", "Closed", "Rejected", "Cancelled"].includes(request.status) && (
                  <Select options={steps.filter((s) => s !== "Closed")} value={request.status} onChange={(e) => onAdvanceStatus(request.id, e.target.value)} />
                )}
                {request.status === "Resolved" && (
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Waiting on the requester to confirm and close</span>
                )}
              </div>
              <div className="h-px bg-slate-100 mb-4" />
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <p className="text-sm font-medium text-slate-700">AI Assist</p>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Button variant="secondary" onClick={runSummary}>Summarize Request</Button>
                <Button variant="secondary" onClick={runSuggestion}>Suggest Resolution</Button>
              </div>
              {aiLoading && (
                <p className="text-xs text-slate-400 flex items-center gap-2 mb-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</p>
              )}
              {aiSummary && <div className="text-sm text-slate-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3">{aiSummary}</div>}
              {aiSuggestion && <div className="text-sm text-slate-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3">{aiSuggestion}</div>}
            </Card>
          )}

          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Activity Timeline</p>
            {isTerminalNegative ? (
              <div className="flex items-center gap-3 text-sm text-rose-600">
                <X className="w-4 h-4" /> Request was {request.status.toLowerCase()}.
              </div>
            ) : (
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const done = i < currentIndex || (i === currentIndex && request.status === "Closed");
                  const current = i === currentIndex && request.status !== "Closed";
                  return (
                    <div key={step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {done ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Circle className={`w-5 h-5 ${current ? "text-indigo-600" : "text-slate-300"}`} />}
                        {i < steps.length - 1 && <div className={`w-px flex-1 min-h-[20px] ${done ? "bg-emerald-200" : "bg-slate-200"}`} />}
                      </div>
                      <p className={`text-sm pb-5 ${current ? "text-slate-900 font-medium" : done ? "text-slate-600" : "text-slate-400"}`}>{step}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="h-px bg-slate-100 my-2" />
            <p className="text-sm font-semibold text-slate-700 mb-3 mt-4">Comments</p>
            <div className="flex items-start gap-3 text-sm text-slate-500">
              <MessageIcon />
              <p>No comments yet. The assigned agent can add updates here.</p>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Details</p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Requester</dt><dd className="text-slate-800">{request.requester}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Department</dt><dd className="text-slate-800">{requesterInfo ? requesterInfo.dept : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Priority</dt><dd><Badge label={request.priority} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Assignee</dt><dd className="text-slate-800">{request.assignee}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">SLA</dt><dd><Badge label={request.sla} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Submitted</dt><dd className="text-slate-800">{request.submitted}</dd></div>
            </dl>
          </Card>
          {(request.attachmentName || request.documentLink) && (
            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Attachments</p>
              {request.attachmentName && (
                <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{request.attachmentName}</span>
                </div>
              )}
              {request.documentLink && (
                <a href={request.documentLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-700 hover:underline">
                  <FileSearch className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Open linked document</span>
                </a>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   MY BOOKINGS
---------------------------------------------------------------------- */

function MyBookingsPage({ bookings, goTo, prefill }) {
  const [tab, setTab] = useState((prefill && prefill.tab) || "Upcoming");
  const tabs = ["Upcoming", "Pending", "Completed"];
  const filtered = bookings.filter((b) => {
    if (tab === "Upcoming") return b.status === "Confirmed";
    if (tab === "Pending") return b.status === "Pending Approval";
    if (tab === "Completed") return b.status === "Completed";
    return true;
  });

  return (
    <div>
      <PageHeader
        title="My Bookings"
        subtitle="Meeting rooms, vehicles, and other resources you have reserved."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => goTo("roomBooking")}><Plus className="w-4 h-4" /> Meeting Room</Button>
            <Button variant="secondary" onClick={() => goTo("vehicleBooking")}><Plus className="w-4 h-4" /> Vehicle</Button>
          </div>
        }
      />
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-sm ${tab === t ? "bg-indigo-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            {t}
          </button>
        ))}
      </div>
      <Card>
        {filtered.length === 0 && <EmptyState icon={CalendarDays} title="No bookings here" body="Book a meeting room or a company vehicle to see it appear here." />}
        {filtered.map((b, i) => (
          <div key={b.id} className={`flex items-center gap-4 px-5 py-4 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              {b.type === "Meeting Room" ? <Users className="w-4 h-4 text-indigo-700" /> : <Car className="w-4 h-4 text-indigo-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{b.resource}</p>
              <p className="text-xs text-slate-500 mt-0.5">{b.id} · {b.date} · {b.time}</p>
            </div>
            <Badge label={b.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------
   MEETING ROOM BOOKING
---------------------------------------------------------------------- */

function RoomBookingPage({ prefill, goTo, onCreateBooking }) {
  const [date, setDate] = useState(prefill.date || "");
  const [start, setStart] = useState(prefill.time || "");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState(prefill.capacity || "");
  const [confirmingRoom, setConfirmingRoom] = useState(null);

  const results = ROOMS.filter((r) => !capacity || r.capacity >= Number(capacity));

  function book(room) {
    const needsApproval = room.capacity > 10;
    onCreateBooking({
      type: "Meeting Room",
      resource: `${room.name} — Floor ${room.floor}`,
      date: date || "Not set",
      time: start ? `${start}–${end || "?"}` : "Not set",
      needsApproval,
    });
    goTo("myBookings");
  }

  return (
    <div>
      <PageHeader title="Meeting Room Booking" onBack={() => goTo("myBookings")} />
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Start Time"><TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="End Time"><TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          <Field label="Capacity"><TextInput type="number" min="1" placeholder="e.g. 8" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field>
        </div>
      </Card>
      <p className="text-sm font-semibold text-slate-700 mb-3">Available Rooms</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {results.map((room) => (
          <Card key={room.id} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-900">{room.name}</p>
              <Badge label="Confirmed" />
            </div>
            <p className="text-xs text-slate-500 mb-3">Floor {room.floor} · Capacity {room.capacity}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {room.facilities.map((f) => <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{f}</span>)}
            </div>
            {room.capacity > 10 && (
              <p className="text-xs text-amber-700 mb-3 flex items-center gap-1"><Info className="w-3 h-3" /> Requires approval (capacity over 10)</p>
            )}
            {confirmingRoom === room.id ? (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => book(room)}>Confirm Booking</Button>
                <Button variant="ghost" onClick={() => setConfirmingRoom(null)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setConfirmingRoom(room.id)}>Book Room</Button>
            )}
          </Card>
        ))}
        {results.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-12">No rooms match that capacity. Try lowering it.</p>}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   VEHICLE BOOKING
---------------------------------------------------------------------- */

function VehicleBookingPage({ prefill, goTo, onCreateBooking, onCreateRequest }) {
  const [purpose, setPurpose] = useState("");
  const [destination, setDestination] = useState(prefill.destination || "");
  const [date, setDate] = useState(prefill.date || "");
  const [time, setTime] = useState(prefill.time || "");
  const [passengers, setPassengers] = useState(prefill.passengers || "");
  const [driverNeeded, setDriverNeeded] = useState(true);
  const [searched, setSearched] = useState(false);

  const results = VEHICLES.filter((v) => !passengers || v.seats >= Number(passengers));

  function request(vehicle) {
    onCreateRequest({ serviceId: "vehicle", title: `${vehicle.name} to ${destination || "destination"}`, priority: "Medium" });
    onCreateBooking({
      type: "Vehicle",
      resource: driverNeeded ? `${vehicle.name} + Driver (${DRIVERS[0]})` : vehicle.name,
      date: date || "Not set",
      time: time || "Not set",
      needsApproval: true,
    });
    goTo("myBookings");
  }

  return (
    <div>
      <PageHeader title="Company Vehicle Booking" onBack={() => goTo("myBookings")} />
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Trip Purpose"><TextInput value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Client visit" /></Field>
          <Field label="Destination"><TextInput value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Bandung" /></Field>
          <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Departure Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field label="Passenger Count"><TextInput type="number" min="1" value={passengers} onChange={(e) => setPassengers(e.target.value)} /></Field>
          <Field label="Driver Required">
            <label className="flex items-center gap-2 text-sm text-slate-700 h-[38px]">
              <input type="checkbox" checked={driverNeeded} onChange={(e) => setDriverNeeded(e.target.checked)} className="rounded border-slate-300" /> Yes, assign a driver
            </label>
          </Field>
        </div>
        <Button className="mt-2" onClick={() => setSearched(true)}><Search className="w-4 h-4" /> Search Availability</Button>
      </Card>

      {searched && (
        <>
          <p className="text-sm font-semibold text-slate-700 mb-3">Available Vehicles</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {results.map((v) => (
              <Card key={v.id} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4 text-indigo-700" />
                  <p className="text-sm font-semibold text-slate-900">{v.name}</p>
                </div>
                <p className="text-xs text-slate-500 mb-1">{v.type} · {v.seats} seats</p>
                {driverNeeded && <p className="text-xs text-slate-500 mb-3">Driver: {DRIVERS[0]}</p>}
                <p className="text-xs text-amber-700 mb-3 flex items-center gap-1"><Info className="w-3 h-3" /> Manager and GA approval required</p>
                <Button variant="secondary" className="w-full" onClick={() => request(v)}>Request Booking</Button>
              </Card>
            ))}
            {results.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-12">No vehicles match that passenger count.</p>}
          </div>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------
   MANAGER PORTAL
---------------------------------------------------------------------- */

function ManagerHomePage({ requests, goTo, services, memberships }) {
  const now = new Date();
  const thisMonth = requests.filter((r) => isThisMonth(r.submitted));
  const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthCount = requests.filter((r) => {
    const d = new Date(r.submitted);
    return d.getMonth() === lastMonthRef.getMonth() && d.getFullYear() === lastMonthRef.getFullYear();
  }).length;
  const lastYearRef = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const lastYearCount = requests.filter((r) => {
    const d = new Date(r.submitted);
    return d.getMonth() === lastYearRef.getMonth() && d.getFullYear() === lastYearRef.getFullYear();
  }).length;

  const open = requests.filter((r) => !["Completed", "Closed", "Rejected", "Cancelled"].includes(r.status));
  const inProgress = requests.filter((r) => r.status === "In Progress");
  const closed = requests.filter((r) => ["Completed", "Closed"].includes(r.status));
  const pendingApproval = requests.filter((r) => r.status === "Pending Approval");
  const rejected = requests.filter((r) => r.status === "Rejected");
  const slaMet = requests.filter((r) => r.sla === "Met");
  const slaBreached = requests.filter((r) => r.sla === "Breached");
  const slaAtRisk = requests.filter((r) => r.sla === "At Risk");
  const awaitingConfirmation = requests.filter((r) => r.status === "Resolved");

  function recordTypeOf(r) {
    const svc = services.find((s) => s.name === r.service);
    return svc ? svc.recordType : "Service Request";
  }
  const incidentCount = requests.filter((r) => recordTypeOf(r) === "Incident").length;
  const serviceRequestCount = requests.filter((r) => recordTypeOf(r) === "Service Request").length;

  // Requests that are ready for an agent but have sat unassigned for a
  // while — the "about to be missed" signal, at the request level.
  const agingUnassigned = requests.filter(
    (r) => ["Submitted", "Approved"].includes(r.status) && r.assignee === "—" && daysAgo(r.submitted) >= 2
  );

  // Structural version of the same question: is there anyone actually
  // staffed to work the assignment group a published service routes to?
  // This is what actually explains why a group's queue never gets
  // touched, rather than just noticing the symptom after the fact.
  const todayIso = new Date().toISOString().slice(0, 10);
  const groupsInUse = Array.from(new Set(services.filter((s) => s.status === "published").map((s) => s.assignmentGroup)));
  const coverageGaps = groupsInUse.map((g) => {
    const owningTeam = TEAMS.find((t) => t.assignmentGroups.includes(g));
    const activeCount = owningTeam ? memberships.filter((m) => m.teamId === owningTeam.id && isMembershipActive(m, todayIso)).length : 0;
    return { group: g, team: owningTeam, activeCount };
  }).filter((g) => g.activeCount === 0);

  function Tile({ icon: Icon, label, value, tab, accent, trend }) {
    return (
      <button onClick={() => goTo("teamRequests", { prefill: { tab } })} className="text-left h-full">
        <Card className="p-3.5 hover:border-indigo-300 transition-colors h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accent}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            {trend}
          </div>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </Card>
      </button>
    );
  }

  const momTrend = lastMonthCount > 0 ? (
    <span className="text-xs font-medium text-slate-500 flex items-center gap-0.5">
      {thisMonth.length >= lastMonthCount ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(Math.round(((thisMonth.length - lastMonthCount) / lastMonthCount) * 100))}%
    </span>
  ) : thisMonth.length > 0 ? (
    <span className="text-xs font-medium text-slate-500">New</span>
  ) : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">{greeting()}, {MANAGER_USER.name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-500 mb-6">{MANAGER_USER.dept} · {MANAGER_USER.location}</p>

      <p className="text-sm font-semibold text-slate-700 mb-3">This Month</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-1">
        <Tile icon={ClipboardList} label={`Total Requests · vs ${lastMonthCount} last month`} value={thisMonth.length} tab="This Month" accent="bg-indigo-50 text-indigo-700" trend={momTrend} />
        <Tile icon={Circle} label="Open" value={open.length} tab="Open" accent="bg-sky-50 text-sky-700" />
        <Tile icon={Loader2} label="In Progress" value={inProgress.length} tab="In Progress" accent="bg-violet-50 text-violet-700" />
        <Tile icon={CheckCircle2} label="Closed" value={closed.length} tab="Closed" accent="bg-emerald-50 text-emerald-700" />
        <Tile icon={CheckSquare} label="Pending Approval" value={pendingApproval.length} tab="Pending Approval" accent="bg-amber-50 text-amber-700" />
        <Tile icon={X} label="Rejected" value={rejected.length} tab="Rejected" accent="bg-rose-50 text-rose-700" />
      </div>
      <p className="text-xs text-slate-400 mb-6">Year-over-year: {lastYearCount > 0 ? `${lastYearCount} this month last year` : "not shown yet — needs 12+ months of live history to compare honestly rather than guess."}</p>

      <p className="text-sm font-semibold text-slate-700 mb-3">By Record Type</p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Tile icon={AlertTriangle} label="Incidents" value={incidentCount} tab="Incidents" accent="bg-rose-50 text-rose-700" />
        <Tile icon={ClipboardList} label="Service Requests" value={serviceRequestCount} tab="Service Requests" accent="bg-indigo-50 text-indigo-700" />
      </div>

      <p className="text-sm font-semibold text-slate-700 mb-3">SLA Achievement</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Tile icon={Check} label="SLA Met" value={slaMet.length} tab="SLA Met" accent="bg-emerald-50 text-emerald-700" />
        <Tile icon={AlertTriangle} label="SLA Breached" value={slaBreached.length} tab="SLA Breached" accent="bg-rose-50 text-rose-700" />
        <Tile icon={TrendingUp} label="SLA At Risk" value={slaAtRisk.length} tab="SLA At Risk" accent="bg-amber-50 text-amber-700" />
        <Tile icon={Info} label="Awaiting Confirmation" value={awaitingConfirmation.length} tab="Awaiting Confirmation" accent="bg-sky-50 text-sky-700" />
      </div>

      <p className="text-sm font-semibold text-slate-700 mb-3">Requests at Risk of Being Missed</p>
      <Card className="mb-4">
        {agingUnassigned.length === 0 && <EmptyState icon={CheckSquare} title="Nothing aging" body="Every ready-to-work request has been picked up. Requests unassigned for 2+ days will show up here." />}
        {agingUnassigned.map((r, i) => (
          <button key={r.id} onClick={() => goTo("requestDetail", { requestId: r.id, prefill: { backTo: "teamRequests" } })} className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.id} · {r.service} · Unassigned for {daysAgo(r.submitted)} days</p>
            </div>
            <Badge label={r.status} />
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        ))}
      </Card>

      <p className="text-sm font-semibold text-slate-700 mb-3">Coverage Gaps</p>
      <Card className="mb-8">
        {coverageGaps.length === 0 && <EmptyState icon={CheckSquare} title="Every assignment group is staffed" body="Every published service routes to a team with at least one active member." />}
        {coverageGaps.map((g, i) => (
          <div key={g.group} className={`flex items-center gap-4 px-5 py-4 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{g.group}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {g.team ? `${g.team.name} has no active members` : "No team owns this assignment group"} — requests here have no one authorized to work them.
              </p>
            </div>
            <Badge label="No Coverage" />
          </div>
        ))}
      </Card>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Pending Approvals</p>
        <button onClick={() => goTo("pendingApprovals")} className="text-xs text-indigo-700 hover:underline">View all</button>
      </div>
      <Card className="mb-8">
        {pendingApproval.length === 0 && <EmptyState icon={CheckSquare} title="Nothing waiting on you" body="New approval requests from your team will show up here." />}
        {pendingApproval.slice(0, 4).map((r, i) => (
          <button key={r.id} onClick={() => goTo("requestDetail", { requestId: r.id, prefill: { backTo: "pendingApprovals" } })} className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.requester} · {r.service} · {r.submitted}</p>
            </div>
            <Badge label={r.priority} />
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        ))}
      </Card>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Team Requests</p>
        <button onClick={() => goTo("teamRequests")} className="text-xs text-indigo-700 hover:underline">View all</button>
      </div>
      <Card>
        {requests.slice(0, 4).map((r, i) => (
          <button key={r.id} onClick={() => goTo("requestDetail", { requestId: r.id, prefill: { backTo: "teamRequests" } })} className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.requester} · {r.service}</p>
            </div>
            <Badge label={r.status} />
          </button>
        ))}
      </Card>
    </div>
  );
}

function PendingApprovalsPage({ requests, goTo }) {
  const pending = requests.filter((r) => r.status === "Pending Approval");
  return (
    <div>
      <PageHeader title="Pending Approvals" subtitle="Requests from your team waiting on your decision." />
      <Card>
        {pending.length === 0 && <EmptyState icon={CheckSquare} title="Nothing waiting on you" body="New approval requests from your team will show up here." />}
        {pending.map((r, i) => (
          <button key={r.id} onClick={() => goTo("requestDetail", { requestId: r.id, prefill: { backTo: "pendingApprovals" } })} className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.id} · {r.requester} · {r.service} · Submitted {r.submitted}</p>
            </div>
            <Badge label={r.priority} />
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        ))}
      </Card>
    </div>
  );
}

function TeamRequestsPage({ requests, goTo, prefill, services }) {
  const [tab, setTab] = useState((prefill && prefill.tab) || "All");
  const tabs = ["All", "This Month", "Open", "In Progress", "Closed", "Pending Approval", "Rejected", "Incidents", "Service Requests", "SLA Met", "SLA Breached", "SLA At Risk", "Awaiting Confirmation"];

  function recordTypeOf(r) {
    const svc = services.find((s) => s.name === r.service);
    return svc ? svc.recordType : "Service Request";
  }

  const filtered = requests.filter((r) => {
    if (tab === "All") return true;
    if (tab === "This Month") return isThisMonth(r.submitted);
    if (tab === "Open") return !["Completed", "Closed", "Rejected", "Cancelled"].includes(r.status);
    if (tab === "In Progress") return r.status === "In Progress";
    if (tab === "Closed") return ["Completed", "Closed"].includes(r.status);
    if (tab === "Pending Approval") return r.status === "Pending Approval";
    if (tab === "Rejected") return r.status === "Rejected";
    if (tab === "Incidents") return recordTypeOf(r) === "Incident";
    if (tab === "Service Requests") return recordTypeOf(r) === "Service Request";
    if (tab === "SLA Met") return r.sla === "Met";
    if (tab === "SLA Breached") return r.sla === "Breached";
    if (tab === "SLA At Risk") return r.sla === "At Risk";
    if (tab === "Awaiting Confirmation") return r.status === "Resolved";
    return true;
  });

  return (
    <div>
      <PageHeader title="Team Requests" subtitle="Every request submitted by your reports." />
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-sm ${tab === t ? "bg-indigo-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            {t}
          </button>
        ))}
      </div>
      <Card>
        {filtered.length === 0 && <EmptyState icon={ClipboardList} title="No requests here" body="Requests matching this filter will show up here." />}
        {filtered.map((r, i) => (
          <button key={r.id} onClick={() => goTo("requestDetail", { requestId: r.id, prefill: { backTo: "teamRequests" } })} className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.id} · {r.requester} · {r.service}</p>
            </div>
            <Badge label={r.status} />
          </button>
        ))}
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------
   AGENT WORKSPACE
---------------------------------------------------------------------- */

function AgentQueuePage({ requests, goTo, services, agentIdentityName, memberships }) {
  const authorizedTeams = getAuthorizedTeams(agentIdentityName, memberships);
  const authorizedGroups = Array.from(new Set(authorizedTeams.flatMap((t) => t.assignmentGroups)));
  const [teamScope, setTeamScope] = useState("combined");
  const [tab, setTab] = useState("My Teams");
  const terminal = ["Completed", "Closed", "Rejected", "Cancelled", "Resolved"];

  if (authorizedTeams.length === 0) {
    return (
      <div>
        <PageHeader title="My Queue" subtitle={`Signed in as ${agentIdentityName}.`} />
        <Card>
          <EmptyState icon={Lock} title="No active team membership" body={`${agentIdentityName} has no currently active team membership, so there is no authorized queue to show. This is what a lapsed or not-yet-started membership looks like in production — access is removed automatically, not just hidden.`} />
        </Card>
      </div>
    );
  }

  const activeGroups = teamScope === "combined" ? authorizedGroups : (authorizedTeams.find((t) => t.id === teamScope)?.assignmentGroups || []);

  function inScope(r) {
    const svc = services.find((s) => s.name === r.service);
    return svc && activeGroups.includes(svc.assignmentGroup);
  }

  const scoped = requests.filter(inScope);
  const assignedToMe = scoped.filter((r) => r.assignee === agentIdentityName && !terminal.includes(r.status));
  const unassigned = scoped.filter((r) => r.assignee === "—" && !terminal.includes(r.status));
  const highPriority = scoped.filter((r) => ["High", "Critical"].includes(r.priority) && !terminal.includes(r.status));
  const slaRisk = scoped.filter((r) => r.sla === "At Risk");

  const tabs = ["My Teams", "Unassigned", "Assigned to Me", "SLA Risk", "Awaiting Confirmation"];
  const filtered = scoped.filter((r) => {
    if (tab === "My Teams") return true;
    if (tab === "Unassigned") return r.assignee === "—";
    if (tab === "Assigned to Me") return r.assignee === agentIdentityName;
    if (tab === "SLA Risk") return r.sla === "At Risk";
    if (tab === "Awaiting Confirmation") return r.status === "Resolved";
    return true;
  });

  return (
    <div>
      <PageHeader
        title="My Queue"
        subtitle={`Signed in as ${agentIdentityName} · ${authorizedTeams.length} authorized team${authorizedTeams.length === 1 ? "" : "s"}.`}
        actions={
          authorizedTeams.length > 1 ? (
            <select className={`${inputClass} sm:w-64`} value={teamScope} onChange={(e) => setTeamScope(e.target.value)}>
              <option value="combined">My Teams (combined)</option>
              {authorizedTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ) : (
            <span className="text-sm text-slate-500 self-center">{authorizedTeams[0].name}</span>
          )
        }
      />
      <Card className="p-3 mb-4 bg-slate-50">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          Scoped to {authorizedTeams.map((t) => t.name).join(", ")} — the teams {agentIdentityName} actually belongs to, not a free choice of any team in the tenant. Selecting a team changes context; it does not grant new access.
        </p>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4"><p className="text-2xl font-semibold text-slate-900">{assignedToMe.length}</p><p className="text-xs text-slate-500 mt-1">Assigned to Me</p></Card>
        <Card className="p-4"><p className="text-2xl font-semibold text-slate-900">{unassigned.length}</p><p className="text-xs text-slate-500 mt-1">Unassigned</p></Card>
        <Card className="p-4"><p className="text-2xl font-semibold text-slate-900">{highPriority.length}</p><p className="text-xs text-slate-500 mt-1">High Priority</p></Card>
        <Card className="p-4"><p className="text-2xl font-semibold text-slate-900">{slaRisk.length}</p><p className="text-xs text-slate-500 mt-1">SLA Risk</p></Card>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-sm ${tab === t ? "bg-indigo-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            {t}
          </button>
        ))}
      </div>
      <Card>
        {filtered.length === 0 && <EmptyState icon={ClipboardList} title="Queue is empty" body="Requests matching this filter will show up here." />}
        {filtered.map((r, i) => (
          <button key={r.id} onClick={() => goTo("requestDetail", { requestId: r.id, prefill: { backTo: "agentQueue" } })} className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.id} · {r.requester} · {r.service} · Assignee: {r.assignee}</p>
            </div>
            <Badge label={r.priority} />
            <Badge label={r.status} />
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        ))}
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------
   ADMIN: ANALYTICS + SLA POLICY
---------------------------------------------------------------------- */

const TREND_COLORS = { IT: "#4338ca", GA: "#0284c7", HR: "#059669" };

function TrendChart({ data }) {
  const categories = ["IT", "GA", "HR"];
  const chartHeight = 160;
  const barWidth = 26;
  const gap = 16;
  const width = data.length * (barWidth + gap) + gap;
  const maxTotal = Math.max(...data.map((d) => d.IT + d.GA + d.HR));

  return (
    <svg viewBox={`0 0 ${width} ${chartHeight + 26}`} className="w-full h-48">
      {data.map((d, i) => {
        const x = gap + i * (barWidth + gap);
        let yOffset = chartHeight;
        return (
          <g key={d.month}>
            {categories.map((cat) => {
              const val = d[cat];
              const h = (val / maxTotal) * chartHeight;
              yOffset -= h;
              return <rect key={cat} x={x} y={yOffset} width={barWidth} height={h} fill={TREND_COLORS[cat]} rx="2" />;
            })}
            <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="8" fill="#94a3b8">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
}

function slaBarColor(rate) {
  if (rate >= 95) return "bg-emerald-600";
  if (rate >= 85) return "bg-amber-500";
  return "bg-rose-600";
}

function AnalyticsPage({ requests, services }) {
  const totalRequests = MONTHLY_TREND.reduce((sum, d) => sum + d.IT + d.GA + d.HR, 0);
  const lastMonth = MONTHLY_TREND[MONTHLY_TREND.length - 1];
  const prevMonth = MONTHLY_TREND[MONTHLY_TREND.length - 2];
  const lastMonthTotal = lastMonth.IT + lastMonth.GA + lastMonth.HR;
  const prevMonthTotal = prevMonth.IT + prevMonth.GA + prevMonth.HR;
  const momChange = Math.round(((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100);
  const yoyChange = Math.round(((lastMonthTotal - SAME_MONTH_LAST_YEAR_TOTAL) / SAME_MONTH_LAST_YEAR_TOTAL) * 100);
  const avgSla = Math.round(SLA_COMPLIANCE.reduce((sum, s) => sum + s.metRate, 0) / SLA_COMPLIANCE.length);

  // Live panel — computed directly from real request records. Any service,
  // old or brand-new from the Service Builder, appears here the instant it
  // has at least one real request. Nothing here is fabricated.
  const liveVolume = {};
  requests.forEach((r) => { liveVolume[r.service] = (liveVolume[r.service] || 0) + 1; });
  const liveVolumeList = Object.entries(liveVolume).map(([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count);
  const maxLiveVolume = liveVolumeList.length ? liveVolumeList[0].count : 1;
  const servicesWithData = liveVolumeList.length;
  const servicesTotal = services.filter((s) => s.status === "published").length;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Request volume, service demand, and SLA achievement across all departments." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-2xl font-semibold text-slate-900">{totalRequests}</p>
          <p className="text-xs text-slate-500 mt-1">Requests · Illustrative Baseline</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold text-slate-900">{avgSla}%</p>
          <p className="text-xs text-slate-500 mt-1">Overall SLA Compliance · Baseline</p>
        </Card>
        <Card className="p-4">
          <p className={`text-2xl font-semibold flex items-center gap-1 ${momChange >= 0 ? "text-slate-900" : "text-emerald-700"}`}>
            {momChange >= 0 ? <TrendingUp className="w-5 h-5 text-amber-600" /> : <TrendingDown className="w-5 h-5 text-emerald-600" />}
            {momChange >= 0 ? "+" : ""}{momChange}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Month over Month</p>
        </Card>
        <Card className="p-4">
          <p className={`text-2xl font-semibold flex items-center gap-1 ${yoyChange >= 0 ? "text-slate-900" : "text-emerald-700"}`}>
            {yoyChange >= 0 ? <TrendingUp className="w-5 h-5 text-amber-600" /> : <TrendingDown className="w-5 h-5 text-emerald-600" />}
            {yoyChange >= 0 ? "+" : ""}{yoyChange}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Year over Year</p>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-slate-700">Request Volume Trend</p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: TREND_COLORS.IT }} /> IT</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: TREND_COLORS.GA }} /> GA</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: TREND_COLORS.HR }} /> HR</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-3">Illustrative historical baseline (Wave 1 launch, Oct '25–Sep '26) — not recomputed from live requests.</p>
        <TrendChart data={MONTHLY_TREND} />
      </Card>

      <Card className="p-5 mb-6 border-indigo-200">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-slate-700">Live Request Volume by Service</p>
          <span className="text-xs text-indigo-700">{servicesWithData} of {servicesTotal} published services have data</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Computed live from real request records — automatically includes any service, including ones just created in Service Builder, from its very first request. No fabricated data.</p>
        {liveVolumeList.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No requests recorded yet.</p>}
        <div className="space-y-3">
          {liveVolumeList.map((s) => (
            <div key={s.service}>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>{s.service}</span>
                <span className="text-slate-400">{s.count}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(s.count / maxLiveVolume) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-slate-700 mb-1">SLA Compliance by Service</p>
        <p className="text-xs text-slate-400 mb-4">Illustrative baseline for the original Wave 1 services — not yet extended to newer services, which have no compliance history yet.</p>
        <div className="space-y-3">
          {SLA_COMPLIANCE.map((s) => {
            const service = services.find((sv) => sv.id === s.serviceId);
            return (
              <div key={s.serviceId}>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>{service ? service.name : s.serviceId}</span>
                  <span className="text-slate-400">{s.metRate}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${slaBarColor(s.metRate)}`} style={{ width: `${s.metRate}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SLAPolicyPage({ slaPolicy, onUpdateTarget, services }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  return (
    <div>
      <PageHeader
        title="SLA Policy"
        subtitle="Configure the service level target for each service. Aligned to ISO/IEC 20000-1 service level management: targets are documented, monitored, and reviewed on a set cycle."
      />
      <Card>
        {services.map((s, i) => {
          const policy = slaPolicy[s.id] || { target: "Not yet defined", lastReviewed: "Not yet reviewed" };
          const Icon = s.icon;
          const isEditing = editingId === s.id;
          return (
            <div key={s.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.domain} · Last reviewed {policy.lastReviewed}</p>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <div className="w-64"><TextInput value={draft} onChange={(e) => setDraft(e.target.value)} /></div>
                  <Button onClick={() => { onUpdateTarget(s.id, draft); setEditingId(null); }}>Save</Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">{policy.target}</span>
                  <button onClick={() => { setEditingId(s.id); setDraft(policy.target); }} className="text-slate-400 hover:text-indigo-700">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {services.length === 0 && <EmptyState icon={SlidersHorizontal} title="No services yet" body="Publish a service in Service Builder to set its SLA target here." />}
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------
   ADMIN: TEAMS & ACCESS
   This is the actual authorization source for Agent Workspace — not the
   team selector agents see, which only ever reads from here.
---------------------------------------------------------------------- */

function TeamsAccessPage({ memberships, onAddMembership, onEndMembership }) {
  const [userName, setUserName] = useState(AGENT_IDENTITIES[0].name);
  const [teamId, setTeamId] = useState(TEAMS[0].id);
  const [roleInTeam, setRoleInTeam] = useState("Agent");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);

  function submit() {
    onAddMembership({ user: userName, teamId, roleInTeam, effectiveFrom, effectiveUntil: effectiveUntil || null });
    setEffectiveUntil("");
  }

  return (
    <div>
      <PageHeader
        title="Teams & Access"
        subtitle="Teams, the assignment groups they own, and who is currently authorized to work each queue. This data — not the team selector agents see — is what actually scopes Agent Workspace."
      />

      <p className="text-sm font-semibold text-slate-700 mb-3">Teams</p>
      <Card className="mb-8">
        {TEAMS.map((t, i) => (
          <div key={t.id} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm font-medium text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.domain} domain</p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {t.assignmentGroups.map((g) => <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{g}</span>)}
            </div>
          </div>
        ))}
      </Card>

      <p className="text-sm font-semibold text-slate-700 mb-3">Add Team Membership</p>
      <Card className="p-5 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Field label="User">
            <select className={inputClass} value={userName} onChange={(e) => setUserName(e.target.value)}>
              {AGENT_IDENTITIES.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Team">
            <select className={inputClass} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Role in Team">
            <select className={inputClass} value={roleInTeam} onChange={(e) => setRoleInTeam(e.target.value)}>
              {["Agent", "Team Lead", "Queue Manager", "Viewer"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Effective From">
            <TextInput type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </Field>
          <Field label="Effective Until (optional)">
            <TextInput type="date" value={effectiveUntil} onChange={(e) => setEffectiveUntil(e.target.value)} />
          </Field>
        </div>
        <Button onClick={submit}><Plus className="w-4 h-4" /> Add Membership</Button>
      </Card>

      <p className="text-sm font-semibold text-slate-700 mb-3">Current Memberships</p>
      <Card>
        {memberships.map((m, i) => {
          const team = TEAMS.find((t) => t.id === m.teamId);
          const active = isMembershipActive(m, todayIso);
          return (
            <div key={i} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm font-medium text-slate-900">{m.user}</p>
                <p className="text-xs text-slate-500 mt-0.5">{team ? team.name : m.teamId} · {m.roleInTeam} · {m.effectiveFrom} → {m.effectiveUntil || "ongoing"}</p>
              </div>
              <Badge label={active ? "Active" : "Expired"} />
              {active && <Button variant="ghost" onClick={() => onEndMembership(i)}>End Membership</Button>}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------
   ADMIN: SERVICE BUILDER (Template Library + Create/Edit + Live Services)
---------------------------------------------------------------------- */

function ServiceBuilderPage({ services, onStartCreate, onStartEdit, onStartClone, onSetStatus }) {
  const [templateDomain, setTemplateDomain] = useState("All");
  const [templateSearch, setTemplateSearch] = useState("");
  const domains = ["All", ...domainsFromLibrary()];
  const filteredTemplates = TEMPLATE_LIBRARY.filter(
    (t) => (templateDomain === "All" || t.domain === templateDomain) && t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Service Builder"
        subtitle="Clone a template or create a service from scratch — no engineering required."
        actions={<Button onClick={onStartCreate}><Plus className="w-4 h-4" /> Create New Service</Button>}
      />

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Template Library</p>
        <span className="text-xs text-slate-400">{TEMPLATE_LIBRARY.length} templates across {domains.length - 1} enterprise domains</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="Search templates" value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-64`} value={templateDomain} onChange={(e) => setTemplateDomain(e.target.value)}>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {filteredTemplates.map((t) => {
          const Icon = iconByKey(t.iconKey);
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.domain} · {t.category}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">{t.description}</p>
              <Button variant="secondary" className="w-full" onClick={() => onStartClone(t)}>
                <Copy className="w-3.5 h-3.5" /> Clone & Configure
              </Button>
            </Card>
          );
        })}
        {filteredTemplates.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-8">No templates match.</p>}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Live Services</p>
        <span className="text-xs text-slate-400">{services.length} services — draft and published</span>
      </div>
      <Card>
        {services.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${i !== 0 ? "border-t border-slate-100" : ""}`}>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.domain} · {s.category}</p>
              </div>
              <Badge label={s.status === "published" ? "Published" : "Draft"} />
              <Button variant="ghost" onClick={() => onSetStatus(s.id, s.status === "published" ? "draft" : "published")}>
                {s.status === "published" ? "Unpublish" : "Publish"}
              </Button>
              <Button variant="secondary" onClick={() => onStartEdit(s)}>Edit</Button>
            </div>
          );
        })}
        {services.length === 0 && <EmptyState icon={LayoutGrid} title="No services yet" body="Clone a template above or create one from scratch." />}
      </Card>
    </div>
  );
}

function ServiceFormPage({ initialData, services, onSave, onCancel }) {
  const [name, setName] = useState(initialData.name || "");
  const [domain, setDomain] = useState(initialData.domain || "");
  const [category, setCategory] = useState(initialData.category || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [iconKey, setIconKey] = useState(initialData.iconKey || "filetext");
  const [customFields, setCustomFields] = useState(
    initialData.formFields ? initialData.formFields.map((f) => ({ label: f.label, type: f.type, optionsText: (f.options || []).join(", ") })) : []
  );
  const [approvalRequired, setApprovalRequired] = useState(initialData.approvalRequired || false);
  const [approverType, setApproverType] = useState(initialData.approverType && initialData.approverType !== "None" ? initialData.approverType : "Manager");
  const [slaTarget, setSlaTarget] = useState(initialData.slaTarget || initialData.suggestedSla || "3 business days");
  const [assignmentGroup, setAssignmentGroup] = useState(initialData.assignmentGroup || "");
  const [visibilityScope, setVisibilityScope] = useState(initialData.visibilityScope || "all");
  const [visibleDepartments, setVisibleDepartments] = useState(initialData.visibleDepartments || []);
  const [notifyRequester, setNotifyRequester] = useState(initialData.notifyRequester !== false);
  const [notifyAssignee, setNotifyAssignee] = useState(initialData.notifyAssignee !== false);
  const [requiresResource, setRequiresResource] = useState(initialData.requiresResource || false);
  const [resourceType, setResourceType] = useState(initialData.resourceType || "");
  const [recordType, setRecordType] = useState(initialData.recordType || "Service Request");

  const domainOptions = Array.from(new Set([...services.map((s) => s.domain), ...domainsFromLibrary()])).sort();
  const categoryOptions = Array.from(new Set([
    ...services.filter((s) => s.domain === domain).map((s) => s.category),
    ...TEMPLATE_LIBRARY.filter((t) => t.domain === domain).map((t) => t.category),
  ]));

  function addField() { setCustomFields((f) => [...f, { label: "", type: "text", optionsText: "" }]); }
  function removeField(i) { setCustomFields((f) => f.filter((_, idx) => idx !== i)); }
  function updateField(i, patch) { setCustomFields((f) => f.map((field, idx) => (idx === i ? { ...field, ...patch } : field))); }

  function toggleDept(dept) {
    setVisibleDepartments((prev) => (prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]));
  }

  function handleSave(nextStatus) {
    const formFields = customFields
      .filter((f) => f.label.trim())
      .map((f, idx) => ({
        name: f.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `field_${idx}`,
        label: f.label,
        type: f.type,
        options: f.type === "select" ? f.optionsText.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      }));
    onSave({
      id: initialData._editingId || undefined,
      name, domain, category, description,
      iconKey,
      icon: iconByKey(iconKey),
      formFields,
      approvalRequired, approverType: approvalRequired ? approverType : "None",
      slaTarget,
      assignmentGroup,
      visibilityScope, visibleDepartments: visibilityScope === "restricted" ? visibleDepartments : [],
      notifyRequester, notifyAssignee,
      requiresResource, resourceType: requiresResource ? resourceType : "",
      recordType,
      status: nextStatus,
    });
  }

  const canSave = name.trim() && domain.trim() && category.trim();

  return (
    <div>
      <PageHeader title={initialData._editingId ? "Edit Service" : "Configure Service"} onBack={onCancel} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Basic Information</p>
            <Field label="Service Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Service Domain" hint="Pick an existing domain or create a new one.">
                <ComboCreate options={domainOptions} value={domain} onChange={setDomain} placeholder="e.g. Marketing" />
              </Field>
              <Field label="Service Category" hint="Scoped within the domain above.">
                <ComboCreate options={categoryOptions} value={category} onChange={setCategory} placeholder="e.g. Campaigns" />
              </Field>
            </div>
            <Field label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Record Type" hint="Drives the Incident vs Service Request breakdown on the Manager Dashboard.">
              <div className="flex gap-2">
                {["Service Request", "Incident"].map((rt) => (
                  <button
                    key={rt} type="button" onClick={() => setRecordType(rt)}
                    className={`px-3 py-2 rounded-lg text-sm ${recordType === rt ? "bg-indigo-700 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {rt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Icon">
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                {ICON_CHOICES.map((c) => {
                  const Icon = c.icon;
                  const active = iconKey === c.key;
                  return (
                    <button
                      key={c.key} type="button" title={c.label} onClick={() => setIconKey(c.key)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border ${active ? "bg-indigo-700 border-indigo-700 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </Field>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-700">Request Form</p>
              <Button variant="secondary" onClick={addField}><Plus className="w-4 h-4" /> Add Field</Button>
            </div>
            {customFields.length === 0 && (
              <p className="text-xs text-slate-400 mb-2">No custom fields yet — this service will use the generic Description + Priority form until you add fields here.</p>
            )}
            <div className="space-y-3 mt-3">
              {customFields.map((f, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-[140px]"><TextInput placeholder="Field label" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} /></div>
                  <select className={`${inputClass} w-40`} value={f.type} onChange={(e) => updateField(i, { type: e.target.value })}>
                    <option value="text">Text</option>
                    <option value="textarea">Text Area</option>
                    <option value="select">Dropdown</option>
                    <option value="link">Link / URL</option>
                  </select>
                  {f.type === "select" && (
                    <div className="flex-1 min-w-[160px]"><TextInput placeholder="Options, comma separated" value={f.optionsText} onChange={(e) => updateField(i, { optionsText: e.target.value })} /></div>
                  )}
                  <button onClick={() => removeField(i)} className="text-slate-400 hover:text-rose-600 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Workflow & Approval</p>
            <Checkbox checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} label="This service requires approval before fulfillment" />
            {approvalRequired && (
              <div className="mt-3">
                <Field label="Approver">
                  <Select options={["Manager", "Manager + Department Head", "Named Approver Group"]} value={approverType} onChange={(e) => setApproverType(e.target.value)} />
                </Field>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">SLA</p>
            <Field label="Target" hint="Editable going forward from the SLA Policy page, same as every other service.">
              <TextInput value={slaTarget} onChange={(e) => setSlaTarget(e.target.value)} placeholder="e.g. 3 business days" />
            </Field>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Assignment & Visibility</p>
            <Field label="Assignment Group" hint="Who this request routes to once approved.">
              <TextInput value={assignmentGroup} onChange={(e) => setAssignmentGroup(e.target.value)} placeholder="e.g. Legal Team" />
            </Field>
            <Field label="Visibility">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={visibilityScope === "all"} onChange={() => setVisibilityScope("all")} /> All Employees
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" checked={visibilityScope === "restricted"} onChange={() => setVisibilityScope("restricted")} /> Restricted to selected departments
                </label>
              </div>
            </Field>
            {visibilityScope === "restricted" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {KNOWN_DEPARTMENTS.map((d) => (
                  <Checkbox key={d} checked={visibleDepartments.includes(d)} onChange={() => toggleDept(d)} label={d} />
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Notifications</p>
            <div className="space-y-2">
              <Checkbox checked={notifyRequester} onChange={(e) => setNotifyRequester(e.target.checked)} label="Notify requester on every status change" />
              <Checkbox checked={notifyAssignee} onChange={(e) => setNotifyAssignee(e.target.checked)} label="Notify assignee when assigned" />
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">Resource Requirement</p>
            <Checkbox checked={requiresResource} onChange={(e) => setRequiresResource(e.target.checked)} label="This service reserves a physical or bookable resource" />
            {requiresResource && (
              <div className="mt-3">
                <Field label="Resource Type" hint="Meeting Room and Vehicle already have live booking flows; any other type is captured as configuration for the Resource Engine.">
                  <TextInput value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="e.g. Meeting Room, Vehicle, Company Asset" />
                </Field>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 sticky top-20">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Publish</p>
            <p className="text-xs text-slate-500 mb-4">Draft services are only visible here in Service Builder. Publishing makes them requestable in the live Service Catalog immediately.</p>
            <div className="flex flex-col gap-2">
              <Button disabled={!canSave} onClick={() => handleSave("published")} className="w-full">Publish</Button>
              <Button disabled={!canSave} variant="secondary" onClick={() => handleSave("draft")} className="w-full">Save as Draft</Button>
              <Button variant="ghost" onClick={onCancel} className="w-full">Cancel</Button>
            </div>
            {!canSave && <p className="text-xs text-rose-600 mt-3">Name, domain, and category are required.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   APPROVALS (empty state) + KNOWLEDGE
---------------------------------------------------------------------- */

function ApprovalsPage() {
  return (
    <div>
      <PageHeader title="My Approvals" subtitle="Items waiting for your decision." />
      <Card>
        <EmptyState icon={CheckSquare} title="No pending approvals" body="You are not currently set as an approver on any request. Items awaiting your decision as a manager or delegate will appear here." />
      </Card>
    </div>
  );
}

function KnowledgePage() {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const filtered = KNOWLEDGE.filter((k) => k.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Knowledge" subtitle="Search approved articles before opening a request." />
      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className={`${inputClass} pl-9`} placeholder="Search knowledge base" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="space-y-3">
        {filtered.map((k) => (
          <Card key={k.id} className="p-5">
            <button className="w-full text-left" onClick={() => setOpenId(openId === k.id ? null : k.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{k.category}</span>
                  <p className="text-sm font-medium text-slate-900">{k.title}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openId === k.id ? "rotate-180" : ""}`} />
              </div>
            </button>
            {openId === k.id && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-sm text-slate-600 mb-3">{k.body}</p>
                {feedbackGiven[k.id] ? (
                  <p className="text-xs text-emerald-600">Thanks for your feedback.</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Was this helpful?</span>
                    <button onClick={() => setFeedbackGiven((f) => ({ ...f, [k.id]: true }))} className="text-slate-400 hover:text-emerald-600"><ThumbsUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setFeedbackGiven((f) => ({ ...f, [k.id]: true }))} className="text-slate-400 hover:text-rose-600"><ThumbsDown className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   APP SHELL
---------------------------------------------------------------------- */

export default function App() {
  const [view, setView] = useState("login");
  const [persona, setPersona] = useState("employee");
  const [prefill, setPrefill] = useState({});
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [slaPolicy, setSlaPolicy] = useState(() => buildInitialSlaPolicy(INITIAL_SERVICES));
  const [serviceFormData, setServiceFormData] = useState({});
  const [toast, setToast] = useState(null);
  const [agentIdentityName, setAgentIdentityName] = useState(AGENT_IDENTITIES[0].name);
  const [memberships, setMemberships] = useState(TEAM_MEMBERSHIPS_SEED);

  function goTo(nextView, opts = {}) {
    setPrefill(opts.prefill || {});
    if (opts.serviceId) setSelectedServiceId(opts.serviceId);
    if (opts.requestId) setSelectedRequestId(opts.requestId);
    setView(nextView);
    window.scrollTo && window.scrollTo({ top: 0 });
  }

  function switchPersona(nextPersona, agentName) {
    setPersona(nextPersona);
    setPrefill({});
    setSelectedServiceId(null);
    setSelectedRequestId(null);
    if (nextPersona === "agent") setAgentIdentityName(agentName || AGENT_IDENTITIES[0].name);
    setView(nextPersona === "employee" ? "home" : nextPersona === "manager" ? "managerHome" : nextPersona === "agent" ? "agentQueue" : "serviceBuilder");
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2800);
  }

  function updateRequestStatus(id, newStatus) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    showToast(`${id} → ${newStatus}`);
  }

  function approveRequest(id) { updateRequestStatus(id, "Approved"); }
  function rejectRequest(id) { updateRequestStatus(id, "Rejected"); }
  function requestMoreInfo(id) { updateRequestStatus(id, "Pending"); }

  function assignToMe(id) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, assignee: agentIdentityName, status: ["Submitted", "Approved"].includes(r.status) ? "Assigned" : r.status } : r)));
    showToast(`${id} assigned to you`);
  }

  function advanceStatus(id, newStatus) {
    updateRequestStatus(id, newStatus);
  }

  function closeRequest(id) { updateRequestStatus(id, "Closed"); }
  function reopenRequest(id) { updateRequestStatus(id, "In Progress"); }

  function addMembership(m) {
    setMemberships((prev) => [...prev, m]);
    showToast(`${m.user} added to ${TEAMS.find((t) => t.id === m.teamId)?.name || m.teamId}`);
  }

  function endMembership(index) {
    const todayIso = new Date().toISOString().slice(0, 10);
    setMemberships((prev) => prev.map((m, i) => (i === index ? { ...m, effectiveUntil: todayIso } : m)));
    showToast("Membership ended");
  }

  function updateSlaTarget(serviceId, newTarget) {
    setSlaPolicy((prev) => ({ ...prev, [serviceId]: { target: newTarget, lastReviewed: todayLabel() } }));
    showToast(`SLA target updated for ${services.find((s) => s.id === serviceId)?.name || serviceId}`);
  }

  function createRequest({ serviceId, title, priority, attachmentName, documentLink }) {
    const service = services.find((s) => s.id === serviceId);
    const id = `REQ-2026-0${150 + requests.length}`;
    const status = service && service.approvalRequired ? "Pending Approval" : "Submitted";
    const newReq = { id, service: service ? service.name : "Service Request", title: title || (service ? service.name : "Request"), submitted: todayLabel(), status, sla: "On Track", assignee: "—", priority: priority || "Medium", requester: CURRENT_USER.name, attachmentName: attachmentName || "", documentLink: documentLink || "" };
    setRequests((prev) => [newReq, ...prev]);
    showToast(`${newReq.id} submitted successfully`);
    return newReq;
  }

  function createBooking({ type, resource, date, time, needsApproval }) {
    const id = `BK-2026-0${90 + bookings.length}`;
    const status = needsApproval ? "Pending Approval" : "Confirmed";
    const newBooking = { id, type, resource, date, time, status };
    setBookings((prev) => [newBooking, ...prev]);
    showToast(needsApproval ? `${id} sent for approval` : `${id} confirmed`);
    return newBooking;
  }

  // --- Service Builder: Template Library → Clone → Configure → Publish ---

  function startCreateService() {
    setServiceFormData({});
    goTo("serviceForm");
  }

  function startEditService(service) {
    const matched = ICON_CHOICES.find((c) => c.icon === service.icon);
    setServiceFormData({ ...service, iconKey: matched ? matched.key : "filetext", slaTarget: (slaPolicy[service.id] && slaPolicy[service.id].target) || "", _editingId: service.id });
    goTo("serviceForm");
  }

  function startCloneTemplate(template) {
    setServiceFormData({
      name: template.name, domain: template.domain, category: template.category, description: template.description,
      iconKey: template.iconKey, suggestedSla: template.suggestedSla,
      approvalRequired: template.approvalRequired, approverType: template.approvalRequired ? "Manager" : "None",
    });
    goTo("serviceForm");
  }

  function saveService(data) {
    const id = data.id || `svc-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
    const newService = {
      id, name: data.name, domain: data.domain, category: data.category, description: data.description,
      icon: data.icon,
      formFields: data.formFields && data.formFields.length ? data.formFields : null,
      approvalRequired: data.approvalRequired, approverType: data.approverType,
      assignmentGroup: data.assignmentGroup,
      visibilityScope: data.visibilityScope, visibleDepartments: data.visibleDepartments,
      notifyRequester: data.notifyRequester, notifyAssignee: data.notifyAssignee,
      requiresResource: data.requiresResource, resourceType: data.resourceType,
      status: data.status,
    };
    setServices((prev) => (prev.some((s) => s.id === id) ? prev.map((s) => (s.id === id ? newService : s)) : [...prev, newService]));
    setSlaPolicy((prev) => ({ ...prev, [id]: { target: data.slaTarget || "Not yet defined", lastReviewed: todayLabel() } }));
    showToast(`${newService.name} ${data.status === "published" ? "published" : "saved as draft"}`);
    goTo("serviceBuilder");
  }

  function setServiceStatus(id, status) {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    showToast(status === "published" ? "Service published" : "Service moved to draft");
  }

  if (view === "login") {
    return <LoginScreen onSignIn={() => goTo("home")} onQuickSignIn={switchPersona} />;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar view={view} goTo={goTo} onSignOut={() => goTo("login")} persona={persona} switchPersona={switchPersona} agentIdentityName={agentIdentityName} setAgentIdentityName={setAgentIdentityName} />
      <div className="flex-1 min-w-0">
        <TopHeader view={view} persona={persona} requests={requests} services={services} agentIdentityName={agentIdentityName} memberships={memberships} />
        <div className="max-w-5xl mx-auto px-6 py-8">
          {view === "home" && <HomePage goTo={goTo} requests={requests} bookings={bookings} services={services} />}
          {view === "catalog" && <CatalogPage goTo={goTo} services={services} />}
          {view === "serviceDetail" && <ServiceDetailPage serviceId={selectedServiceId} prefill={prefill} goTo={goTo} onCreateRequest={createRequest} slaPolicy={slaPolicy} services={services} />}
          {view === "myRequests" && <MyRequestsPage requests={requests} goTo={goTo} prefill={prefill} />}
          {view === "requestDetail" && (
            <RequestDetailPage
              requestId={selectedRequestId}
              requests={requests}
              goTo={goTo}
              prefill={prefill}
              viewer={persona}
              services={services}
              agentIdentityName={agentIdentityName}
              memberships={memberships}
              onApprove={approveRequest}
              onReject={rejectRequest}
              onRequestInfo={requestMoreInfo}
              onAssignToMe={assignToMe}
              onAdvanceStatus={advanceStatus}
              onCloseRequest={closeRequest}
              onReopenRequest={reopenRequest}
              onToast={showToast}
            />
          )}
          {view === "myBookings" && <MyBookingsPage bookings={bookings} goTo={goTo} prefill={prefill} />}
          {view === "roomBooking" && <RoomBookingPage prefill={prefill} goTo={goTo} onCreateBooking={createBooking} />}
          {view === "vehicleBooking" && <VehicleBookingPage prefill={prefill} goTo={goTo} onCreateBooking={createBooking} onCreateRequest={createRequest} />}
          {view === "approvals" && <ApprovalsPage />}
          {view === "knowledge" && <KnowledgePage />}
          {view === "managerHome" && <ManagerHomePage requests={requests} goTo={goTo} services={services} memberships={memberships} />}
          {view === "pendingApprovals" && <PendingApprovalsPage requests={requests} goTo={goTo} />}
          {view === "teamRequests" && <TeamRequestsPage requests={requests} goTo={goTo} prefill={prefill} services={services} />}
          {view === "agentQueue" && <AgentQueuePage requests={requests} goTo={goTo} services={services} agentIdentityName={agentIdentityName} memberships={memberships} />}
          {view === "analytics" && <AnalyticsPage requests={requests} services={services} />}
          {view === "slaPolicy" && <SLAPolicyPage slaPolicy={slaPolicy} onUpdateTarget={updateSlaTarget} services={services} />}
          {view === "serviceBuilder" && (
            <ServiceBuilderPage services={services} onStartCreate={startCreateService} onStartEdit={startEditService} onStartClone={startCloneTemplate} onSetStatus={setServiceStatus} />
          )}
          {view === "serviceForm" && (
            <ServiceFormPage initialData={serviceFormData} services={services} onSave={saveService} onCancel={() => goTo("serviceBuilder")} />
          )}
          {view === "teamsAccess" && (
            <TeamsAccessPage memberships={memberships} onAddMembership={addMembership} onEndMembership={endMembership} />
          )}
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
