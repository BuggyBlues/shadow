const icons = ['Check', 'Home', 'Compass', 'Bot', 'Settings', 'Search', 'Shield', 'Users', 'Plus', 'Send', 'Paperclip', 'X', 'Reply', 'Save', 'Trash2', 'Edit3', 'ShoppingCart', 'Minus', 'Package', 'Star', 'ChevronLeft', 'ChevronRight', 'Bell', 'Copy', 'SmilePlus', 'LayoutGrid', 'ExternalLink', 'Hash', 'Volume2', 'Lock', 'MessageSquare', 'Crown', 'UserPlus', 'MoreVertical', 'ArrowDown', 'ChevronDown', 'Upload', 'FileText', 'Folder', 'FolderPlus', 'File', 'Download', 'Pencil', 'Clock', 'DollarSign', 'AlertCircle', 'CheckCircle', 'XCircle', 'ArrowLeft', 'Globe', 'Moon', 'LogOut', 'User', 'Info', 'RefreshCw'];
const lucide = require('lucide-react-native');
const missing = icons.filter(i => !lucide[i]);
console.log('Missing icons:', missing.length ? missing.join(', ') : 'None');
