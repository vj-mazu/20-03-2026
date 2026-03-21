const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'CookingReport.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
if (!content.includes('SampleEntryDetailModal')) {
    content = content.replace(
        "import { useNotification } from '../contexts/NotificationContext';",
        "import { useNotification } from '../contexts/NotificationContext';\nimport { SampleEntryDetailModal } from '../components/SampleEntryDetailModal';"
    );
}

// 2. States
content = content.replace(
    /const \[historyModal, setHistoryModal\] = useState[^;]+;\n\s*const \[detailEntry, setDetailEntry\] = useState<any \| null>\(null\);\n\s*const \[detailLoading, setDetailLoading\] = useState\(false\);\n\s*const \[remarksPopup, setRemarksPopup\] = useState[^;]+;/,
    "const [detailEntry, setDetailEntry] = useState<any | null>(null);\n  const [detailLoading, setDetailLoading] = useState(false);"
);

// 3. handleOpenHistory
content = content.replace(
    /const handleOpenHistory = \(entry: any, type: 'all' \| 'cooking' \| 'approval' \| 'single-remark' = 'all', singleEventOverride: any = null\) => \{[\s\S]+?const handleOpenDetail = async \(entry: SampleEntry\) => \{/,
    `const handleOpenHistory = (entry: any, type: 'all' | 'cooking' | 'approval' | 'single-remark' = 'all', singleEventOverride: any = null) => {
    if (type === 'single-remark' && singleEventOverride) {
      alert(singleEventOverride.remarks);
      return;
    }
    setDetailEntry(entry);
  };

  const handleOpenDetail = async (entry: SampleEntry) => {`
);

// 4. Detail popups
const startTag = "{/* Detail Popup (same design as Admin Sample Book) */}";
const endTag = "{/* Pagination Controls */}";
const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = `
      {detailEntry && (
        <SampleEntryDetailModal
          detailEntry={detailEntry as any}
          detailMode="history"
          onClose={() => setDetailEntry(null)}
        />
      )}

      `;
    content = content.substring(0, startIndex) + newContent + content.substring(endIndex);
} else {
    console.error("Tags not found for popups");
}

fs.writeFileSync(filePath, content);
console.log("CookingReport.tsx updated successfully!");
