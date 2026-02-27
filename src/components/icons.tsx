import React from 'react';

export type IconProps = React.HTMLAttributes<HTMLElement> & {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
};

const createIcon = (remixClass: string) => {
  return function Icon({ className = '', size = 24, color = 'currentColor', strokeWidth, ...rest }: IconProps) {
    let styleObj: React.CSSProperties = { fontSize: size, color: color };
    if (className === '') className = 'w-4 h-4';
    return (
      <i
        className={`${remixClass} block w-auto h-auto min-w-[1em] ${className}`}
        style={styleObj}
        {...rest as any}
      />
    );
  };
};

export type LucideIcon = React.FC<IconProps>;

export const AlertCircle = createIcon('ri-error-warning-line');
export const AlertTriangle = createIcon('ri-alert-line');
export const ArrowLeft = createIcon('ri-arrow-left-line');
export const ArrowRight = createIcon('ri-arrow-right-line');
export const Ban = createIcon('ri-forbid-line');
export const BarChart3 = createIcon('ri-bar-chart-2-line');
export const Bed = createIcon('ri-hotel-bed-line');
export const Bell = createIcon('ri-notification-3-line');
export const BellRing = createIcon('ri-notification-3-fill');
export const BookOpen = createIcon('ri-book-open-line');
export const BriefcaseMedical = createIcon('ri-briefcase-4-line');
export const Building2 = createIcon('ri-building-4-line');
export const Calendar = createIcon('ri-calendar-line');
export const CalendarCheck = createIcon('ri-calendar-check-line');
export const CalendarIcon = createIcon('ri-calendar-line');
export const CalendarPlus = createIcon('ri-calendar-todo-line');
export const Camera = createIcon('ri-camera-3-line');
export const Car = createIcon('ri-car-line');
export const CarFront = createIcon('ri-car-line');
export const Cctv = createIcon('ri-camera-lens-line');
export const Check = createIcon('ri-check-line');
export const CheckCircle = createIcon('ri-checkbox-circle-line');
export const CheckCircle2 = createIcon('ri-checkbox-circle-line');
export const ChevronDown = createIcon('ri-arrow-down-s-line');
export const ChevronDownIcon = createIcon('ri-arrow-down-s-line');
export const ChevronLeft = createIcon('ri-arrow-left-s-line');
export const ChevronLeftIcon = createIcon('ri-arrow-left-s-line');
export const ChevronRight = createIcon('ri-arrow-right-s-line');
export const ChevronRightIcon = createIcon('ri-arrow-right-s-line');
export const ChevronUp = createIcon('ri-arrow-up-s-line');
export const CigaretteOff = createIcon('ri-forbid-2-line');
export const Circle = createIcon('ri-checkbox-blank-circle-line');
export const Clock = createIcon('ri-time-line');
export const Coffee = createIcon('ri-cup-line');
export const Copy = createIcon('ri-file-copy-line');
export const CreditCard = createIcon('ri-bank-card-line');
export const Crown = createIcon('ri-vip-crown-line');
export const DollarSign = createIcon('ri-money-dollar-circle-line');
export const Download = createIcon('ri-download-2-line');
export const Edit = createIcon('ri-edit-line');
export const Edit2 = createIcon('ri-edit-2-line');
export const ExternalLink = createIcon('ri-external-link-line');
export const Eye = createIcon('ri-eye-line');
export const EyeOff = createIcon('ri-eye-off-line');
export const FileEdit = createIcon('ri-file-edit-line');
export const FileText = createIcon('ri-file-text-line');
export const Filter = createIcon('ri-filter-3-line');
export const FireExtinguisher = createIcon('ri-fire-fill');
export const GlassWater = createIcon('ri-goblet-line');
export const GripVertical = createIcon('ri-drag-move-2-line');
export const Hammer = createIcon('ri-hammer-line');
export const Hash = createIcon('ri-hashtag');
export const Headset = createIcon('ri-headphone-line');
export const History = createIcon('ri-history-line');
export const Home = createIcon('ri-home-line');
export const Info = createIcon('ri-information-line');
export const Key = createIcon('ri-key-line');
export const LayoutDashboard = createIcon('ri-dashboard-line');
export const LayoutGrid = createIcon('ri-grid-line');
export const Link = createIcon('ri-links-line');
export const List = createIcon('ri-list-check');
export const Loader2 = createIcon('ri-loader-4-line');
export const LogIn = createIcon('ri-login-box-line');
export const LogOut = createIcon('ri-logout-box-line');
export const Mail = createIcon('ri-mail-line');
export const MapPin = createIcon('ri-map-pin-line');
export const Megaphone = createIcon('ri-megaphone-line');
export const Menu = createIcon('ri-menu-line');
export const MessageSquare = createIcon('ri-message-3-line');
export const Mic = createIcon('ri-mic-line');
export const MicOff = createIcon('ri-mic-off-line');
export const Minus = createIcon('ri-subtract-line');
export const Moon = createIcon('ri-moon-line');
export const MoreHorizontal = createIcon('ri-more-line');
export const MoreVertical = createIcon('ri-more-2-line');
export const Network = createIcon('ri-node-tree');
export const PanelLeft = createIcon('ri-layout-left-line');
export const Pencil = createIcon('ri-pencil-line');
export const Percent = createIcon('ri-percent-line');
export const Phone = createIcon('ri-phone-line');
export const Plus = createIcon('ri-add-line');
export const Printer = createIcon('ri-printer-line');
export const QrCode = createIcon('ri-qr-code-line');
export const Receipt = createIcon('ri-receipt-line');
export const ReceiptText = createIcon('ri-file-list-3-line');
export const RefreshCw = createIcon('ri-refresh-line');
export const Search = createIcon('ri-search-line');
export const Send = createIcon('ri-send-plane-line');
export const Settings = createIcon('ri-settings-4-line');
export const Share2 = createIcon('ri-share-line');
export const Shield = createIcon('ri-shield-line');
export const ShieldAlert = createIcon('ri-shield-flash-line');
export const ShieldCheck = createIcon('ri-shield-check-line');
export const ShoppingCart = createIcon('ri-shopping-cart-line');
export const Smartphone = createIcon('ri-smartphone-line');
export const Snowflake = createIcon('ri-snowy-line');
export const Sparkles = createIcon('ri-sparkling-line');
export const SquareParking = createIcon('ri-parking-box-line');
export const Star = createIcon('ri-star-line');
export const Sun = createIcon('ri-sun-line');
export const Table = createIcon('ri-table-line');
export const Tag = createIcon('ri-price-tag-3-line');
export const Terminal = createIcon('ri-terminal-box-line');
export const Monitor = createIcon('ri-macbook-line');
export const TestTube = createIcon('ri-test-tube-line');
export const Trash = createIcon('ri-delete-bin-line');
export const Trash2 = createIcon('ri-delete-bin-line');
export const TrendingDown = createIcon('ri-stock-line');
export const TrendingUp = createIcon('ri-stock-line');
export const Tv = createIcon('ri-tv-2-line');
export const User = createIcon('ri-user-line');
export const UserCheck = createIcon('ri-user-follow-line');
export const UserPlus = createIcon('ri-user-add-line');
export const Users = createIcon('ri-group-line');
export const Utensils = createIcon('ri-restaurant-line');
export const Volume2 = createIcon('ri-volume-up-line');
export const Wand2 = createIcon('ri-magic-line');
export const Wifi = createIcon('ri-wifi-line');
export const WifiOff = createIcon('ri-wifi-off-line');
export const Wine = createIcon('ri-goblet-line');
export const X = createIcon('ri-close-line');
export const XCircle = createIcon('ri-close-circle-line');

