const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, 'f2t-frontend/src');

function replaceInFile(filePath, regex, replacement) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(regex, replacement);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

replaceInFile(
  path.join(FRONTEND_DIR, 'app/(app)/feed.tsx'),
  /import\s+\{\s*useRouter\s*\}\s+from\s+[^;]+;/g,
  ''
);

replaceInFile(
  path.join(FRONTEND_DIR, 'app/(app)/_layout.tsx'),
  /import\s+CreateNewPostLink\s+from\s+[^;]+;/g,
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
