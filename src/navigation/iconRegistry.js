import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bandage,
  BarChart3,
  Bell,
  Book,
  BookOpen,
  Bot,
  Braces,
  Brain,
  Footprints,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CircleDollarSign,
  Contrast,
  Dna,
  Download,
  Droplets,
  Dumbbell,
  FileSpreadsheet,
  FileText,
  Flame,
  FlaskConical,
  FileEdit,
  HeartPulse,
  Hospital,
  Keyboard,
  Layers,
  LayoutDashboard,
  Loader2,
  LifeBuoy,
  Lightbulb,
  LineChart,
  Link2,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Mail,
  Microscope,
  Moon,
  Palette,
  Pin,
  Pill,
  Rocket,
  Scale,
  ScrollText,
  Search,
  Settings,
  Shield,
  Siren,
  Smartphone,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Syringe,
  TestTube2,
  Trash2,
  Trophy,
  Upload,
  User,
  Users,
  WifiOff,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

const FALLBACK = Layers;

/** Primary app routes (Sidebar / Navigation) */
const NAV_ICONS = {
  chat: MessageSquare,
  'clinical-alerts': Siren,
  profile: User,
  team: Users,
  audit: ScrollText,
  analytics: LineChart,
  settings: Settings,
};

/** Tool registry ids */
const TOOL_ICONS = {
  'drug-check': Pill,
  'lab-interp': FlaskConical,
  calculators: Calculator,
  'sofa-score': Hospital,
  'calc-gfr': Activity,
  'calc-bmi': Scale,
  'calc-chads2vasc': HeartPulse,
  qsofa: Siren,
  news2: ClipboardList,
  'child-pugh': Microscope,
  'has-bled': Bandage,
  meld: TestTube2,
  'meld-na': TestTube2,
  'timi-ua-nstemi': HeartPulse,
  'wells-pe': HeartPulse,
  perc: Wind,
  'grace-acs': HeartPulse,
  nihss: Brain,
  'canadian-c-spine': Braces,
  'ottawa-ankle': Footprints,
  protocols: ClipboardList,
  diagnosis: Stethoscope,
  procedures: BookOpen,
};

const TOOL_ID_ALIASES = {
  'drug-interaction-checker': 'drug-check',
  'drug-interactions': 'drug-check',
  'lab-interpreter': 'lab-interp',
  'sofa-calculator': 'sofa-score',
};

/** Calculator sub-cards (Calculators.jsx) */
const CALCULATOR_SUB_ICONS = {
  sofa: Hospital,
  qsofa: Siren,
  news2: ClipboardList,
  'child-pugh': Microscope,
  'has-bled': Bandage,
  meld: TestTube2,
  'meld-na': TestTube2,
  'timi-ua-nstemi': HeartPulse,
  gfr: Activity,
  bmi: Scale,
  chads2vasc: HeartPulse,
};

/** Lab Interpreter category headers */
const LAB_CATEGORY_ICONS = {
  CBC: Droplets,
  Electrolytes: Zap,
  'Renal Function': Activity,
  'Liver Function': TestTube2,
  Coagulation: Bandage,
  Other: FlaskConical,
};

/** featureInventory.js ids */
const FEATURE_ICONS = {
  'drug-interactions': Pill,
  calculators: Calculator,
  protocols: ClipboardList,
  'lab-interpreter': FlaskConical,
  diagnosis: Search,
  procedures: BookOpen,
  'ai-workflow': Brain,
  'audit-logging': FileText,
  'drug-database': Book,
  'offline-access': WifiOff,
  'fhir-hl7-dicom': Link2,
  'custom-branding': Palette,
  'dedicated-support': LifeBuoy,
  'sso-saml': Lock,
  'team-management': Users,
  'ai-query-limits': Zap,
};

/**
 * Lucide keys persisted on `workspace.icon` (new workspaces).
 * Legacy emoji values are mapped internally for getWorkspaceIcon.
 */
export const WORKSPACE_ICON_CHOICES = {
  Hospital,
  Stethoscope,
  Pill,
  Dna,
  FlaskConical,
  Syringe,
  Bandage,
  Microscope,
  LineChart,
  LayoutDashboard,
  Zap,
  Flame,
  Lightbulb,
  Palette,
  Rocket,
  Star,
  Trophy,
  Dumbbell,
  Brain,
  Heart: HeartPulse,
  Bell,
  Smartphone,
  Siren,
};

export const WORKSPACE_PICK_KEYS = [
  'Hospital',
  'Stethoscope',
  'Pill',
  'Dna',
  'FlaskConical',
  'Syringe',
  'Bandage',
  'Microscope',
  'LineChart',
  'LayoutDashboard',
  'Zap',
  'Flame',
  'Lightbulb',
  'Palette',
  'Rocket',
  'Star',
  'Trophy',
  'Dumbbell',
  'Brain',
  'Heart',
  'Bell',
  'Smartphone',
  'Siren',
];

/** Map legacy emoji workspace icons to Lucide components (internal; used by getWorkspaceIcon). */
const WORKSPACE_EMOJI_TO_ICON = {
  '🏥': Hospital,
  '⚕️': Stethoscope,
  '🩺': Stethoscope,
  '💊': Pill,
  '🧬': Dna,
  '🔬': FlaskConical,
  '💉': Syringe,
  '🩹': Bandage,
  '🧪': FlaskConical,
  '📊': LineChart,
  '📈': LineChart,
  '🎯': LayoutDashboard,
  '⚡': Zap,
  '🔥': Flame,
  '💡': Lightbulb,
  '🎨': Palette,
  '🚀': Rocket,
  '⭐': Star,
  '🏆': Trophy,
  '💪': Dumbbell,
  '🧠': Brain,
  '❤️': HeartPulse,
  '🔔': Bell,
  '📱': Smartphone,
  '🚨': Siren,
};

export const CHROME_ICONS = {
  menu: Menu,
  sun: Sun,
  moon: Moon,
  contrast: Contrast,
  sparkles: Sparkles,
  message: MessageSquare,
  tools: Wrench,
  hospital: Hospital,
  bell: Bell,
  logOut: LogOut,
  bolt: Zap,
  zap: Zap,
  star: Star,
  pin: Pin,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  messageCircle: MessageCircle,
  close: X,
  upload: Upload,
  bot: Bot,
  check: Check,
  checkCircle: CheckCircle2,
  circleDollar: CircleDollarSign,
  user: User,
  users: Users,
  shield: Shield,
  lock: Lock,
  lineChart: LineChart,
  alert: AlertTriangle,
  arrowLeft: ArrowLeft,
  rocket: Rocket,
  lightbulb: Lightbulb,
  shareLink: Link2,
  download: Download,
  mail: Mail,
  copy: Copy,
  loader: Loader2,
  formatJson: Braces,
  formatCsv: FileSpreadsheet,
  formatPdf: FileText,
  siren: Siren,
  trash: Trash2,
  barChart: BarChart3,
  keyboard: Keyboard,
  fileEdit: FileEdit,
  clipboardList: ClipboardList,
  microscope: Microscope,
  calculator: Calculator,
  stethoscope: Stethoscope,
  heartPulse: HeartPulse,
  bandage: Bandage,
  activity: Activity,
  scale: Scale,
};

export function getNavIcon(id) {
  return NAV_ICONS[id] || FALLBACK;
}

export function getToolIcon(id) {
  if (!id) return FALLBACK;
  const canonical = TOOL_ID_ALIASES[id] || id;
  return TOOL_ICONS[canonical] || FALLBACK;
}

export function getFeatureIcon(id) {
  return FEATURE_ICONS[id] || TOOL_ICONS[id] || FALLBACK;
}

export function getCalculatorSubIcon(id) {
  return CALCULATOR_SUB_ICONS[id] || Calculator;
}

export function getLabCategoryIcon(category) {
  return LAB_CATEGORY_ICONS[category] || FlaskConical;
}

/**
 * Resolve workspace glyph: Lucide choice key, or legacy emoji, or Hospital.
 */
export function getWorkspaceIcon(stored) {
  if (!stored) return Hospital;
  const fromKey = WORKSPACE_ICON_CHOICES[stored];
  if (fromKey) return fromKey;
  const fromEmoji = WORKSPACE_EMOJI_TO_ICON[stored];
  if (fromEmoji) return fromEmoji;
  return Hospital;
}
