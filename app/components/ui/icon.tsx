import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Banknote,
  Bell,
  Building2,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  CloudOff,
  FileCheck,
  Files,
  Flame,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  TriangleAlert,
  Users,
  WifiOff,
  Wrench,
  X,
  Zap,
  Droplet,
} from 'lucide-react';

export const brandIcons = {
  building: Building2,
  activity: Activity,
  clipboard: ClipboardList,
  mapPin: MapPin,
  files: Files,
  wrench: Wrench,
  layout: LayoutDashboard,
  banknote: Banknote,
  users: Users,
  settings: Settings,
  more: MoreHorizontal,
  bell: Bell,
  droplet: Droplet,
  flame: Flame,
  zap: Zap,
  camera: Camera,
  circleAlert: CircleAlert,
  triangleAlert: TriangleAlert,
  check: Check,
  plus: Plus,
  search: Search,
  info: Info,
  lock: Lock,
  refresh: RefreshCw,
  loader: LoaderCircle,
  cloudOff: CloudOff,
  wifiOff: WifiOff,
  fileCheck: FileCheck,
  x: X,
  chevronRight: ChevronRight,
} as const;

export type BrandIconName = keyof typeof brandIcons;

export function BrandIcon({
  name,
  size = 16,
  strokeWidth = 1.75,
  className,
}: {
  name: BrandIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon: LucideIcon = brandIcons[name];
  return <Icon className={['brand-icon', className].filter(Boolean).join(' ')} size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}
