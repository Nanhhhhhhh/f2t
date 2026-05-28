const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'f2t-backend/src');
const FRONTEND_DIR = path.join(__dirname, 'f2t-frontend/src');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.next', 'build'].includes(file)) {
        walk(path.join(dir, file), fileList);
      }
    } else {
      if (
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        !file.endsWith('.spec.ts') &&
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.tsx')
      ) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

const allFiles = [...walk(BACKEND_DIR), ...walk(FRONTEND_DIR)];
const modifiedFiles = new Set();

function replaceInFile(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(regex, replacement);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    modifiedFiles.add(filePath);
  }
}

// 1. Remove console logs
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Regex to remove console.log, etc.
  // It handles multi-line console statements by matching until the first );
  // Exception: keep console.error in f2t-backend/src/main.ts
  if (file.endsWith('main.ts')) {
    newContent = newContent.replace(/^[ \t]*console\.(log|warn|debug|info)\([^]*?\);?[ \t]*\r?\n/gm, '');
  } else {
    newContent = newContent.replace(/^[ \t]*console\.(log|error|warn|debug|info)\([^]*?\);?[ \t]*\r?\n/gm, '');
  }

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedFiles.add(file);
  }
}

// 2. Unused imports backend
replaceInFile(
  path.join(BACKEND_DIR, 'modules/auth/strategies/jwt.strategy.ts'),
  /private configService: ConfigService,?/g,
  ''
);

replaceInFile(
  path.join(BACKEND_DIR, 'modules/payments/payments.controller.ts'),
  /private readonly ordersService: OrdersService,\s*private readonly notificationsService: NotificationsService,?/g,
  ''
);

// 3. Unused imports frontend
replaceInFile(
  path.join(FRONTEND_DIR, 'app/(app)/feed.tsx'),
  /import\s+\{\s*useRouter\s*\}\s+from\s+[^;]+;/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'app/(app)/_layout.tsx'),
  /import\s+CreateNewPostLink\s+from\s+[^;]+;/g, // just remove the statement, or we can just run a general replace
  ''
);
// It might be a named import: import { CreateNewPostLink }
replaceInFile(
  path.join(FRONTEND_DIR, 'app/(app)/_layout.tsx'),
  /import\s+\{\s*CreateNewPostLink\s*\}\s+from\s+[^;]+;/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'components/orders/order-status-badge.tsx'),
  /,\s*RefreshCw/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'components/orders/order-status-timeline.tsx'),
  /import\s+\{\s*ScrollView\s*\}\s+from\s+[^;]+;/g,
  ''
);
replaceInFile(
  path.join(FRONTEND_DIR, 'components/orders/order-status-timeline.tsx'),
  /,\s*RefreshCw/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'components/orders/order-timeline-event.tsx'),
  /,\s*RefreshCw/g,
  ''
);
replaceInFile(
  path.join(FRONTEND_DIR, 'components/orders/order-timeline-event.tsx'),
  /,\s*Truck/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'components/farms/farm-profile-edit-form.tsx'),
  /import\s+\{\s*ScrollView\s*\}\s+from\s+[^;]+;/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'components/checkout/checkout-form.tsx'),
  /,\s*useEffect/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'lib/cart/utils.tsx'),
  /const farmGroups = [^;]+;/g,
  ''
);
replaceInFile(
  path.join(FRONTEND_DIR, 'lib/cart/utils.tsx'),
  /const currentMonth = [^;]+;/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'lib/hooks/use-selected-theme.tsx'),
  /const _color = [^;]+;/g,
  ''
);

// 4. Remove Commented out code blocks
// We look for 3+ lines of // that have code-like symbols (=, {, }, ;, ()
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Find blocks of // comments
  const blockRegex = /(?:^[ \t]*\/\/.*(?:\r?\n|$)){3,}/gm;
  newContent = newContent.replace(blockRegex, (match) => {
    // If it looks like code (has { or = or ; or => or function), remove it
    if (/[{}=;]/.test(match) || match.includes('function') || match.includes('=>')) {
      return ''; // remove
    }
    return match; // keep if it's just text documentation
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedFiles.add(file);
  }
}

console.log("Modified files:");
console.log(Array.from(modifiedFiles).join('\n'));
